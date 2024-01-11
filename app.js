const express = require('express');
const http = require('http');
const socket = require('socket.io');

const app = express();
app.set('port', process.env.PORT || 80);
app.use(express.static(__dirname + '/static'));

const server = http.createServer(app);
const io = socket(server);

const path = require('path');

const notifier = require('node-notifier');

const chatUtils = require('./utils/chatUtils');
const imageUtils = require('./utils/imageUtils');

const connection = require('./database/connect/maria')
connection.connect();

/* 이미지 업로드 */
app.post('/upload', imageUtils.upload.array('imgs', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('이미지를 선택하세요.');
    }

    const { roomID, sender, receiver } = req.body;

    try {
        const imagePaths = [];

        for (const file of req.files) {
            const imagePath = path.join('../upload', file.filename);
            imagePaths.push(imagePath);

            await imageUtils.saveImageToChatMessage(roomID, sender, receiver, imagePath);
        }

        res.status(200).json({ imagePaths }); // JSON 응답 반환
        console.log(imagePaths);
        console.log(__dirname);
    } catch (error) {
        console.error('Error retrieving upload images:', error);
        res.status(500).send('이미지를 업로드하지 못했습니다.');
    }
});

/* 서버 시작 */
server.listen(80, function() {
    console.log('listening on *:80');
});

io.on('connection', (socket) => {

    // 클라이언트가 보낸 유저 정보를 받음
    socket.on('sendUserInformation', async (sender, receiver)=>{
        console.log(sender, receiver);

        // 클라이언트로 roomID 전송
        const roomID = chatUtils.generateRoomID(sender, receiver);

        // 현재 소켓의 모든 룸을 나가고 새로운 룸에 조인
        Object.keys(socket.rooms).forEach((room) => {
            if (room !== socket.id) {
                socket.leave(room);
            }
        });

        socket.join(roomID); // 현재 소켓을 선택한 채팅방에 조인
        console.log(`Socket ${socket.id} joined room ${roomID}`);

        // 현재 소켓에 enteredChatRoom 이벤트를 보내고, 새로운 채팅방의 정보를 전송
        io.to(socket.id).emit('enteredChatRoom', roomID);

        // DB에서 해당 채팅방의 메시지를 가져와 클라이언트에게 전송
        const query = `SELECT *
        FROM (
            SELECT cm.message_id, cm.message, cm.sender, cm.receiver, cm.created_at, cm.type 
            FROM chat_message cm 
            LEFT JOIN chat_image ci ON cm.message_id = ci.message_id 
            WHERE room_id = ?
            ORDER BY created_at DESC, message_id DESC
            LIMIT ?
        ) AS sub
        ORDER BY created_at ASC`
        const perPage = 30;

        connection.query(
            query,
            [roomID, perPage],
            (error, results, fields) => {
                if (error) {
                    console.error('Error retrieving messages from DB:', error);
                    socket.emit('errorOccurred', { errorMessage: '대화 내역을 불러오지 못했습니다.' });
                } else {
                    socket.emit('initialChatLoad', results);
                }
            }
        );
    });

    // DB에서 해당 방(room)의 가장 오래된 메시지를 가져옴
    socket.on('loadOldestMessage', (data) => {
        const roomID = data.roomID;
        
        const query = `
            SELECT created_at
            FROM chat_message
            WHERE room_id = ?
            ORDER BY created_at ASC, message_id ASC
            LIMIT 1
        `;
        
        connection.query(
            query,
            [roomID],
            (error, results, fields) => {
            if (error) {
                console.error('Error retrieving oldest message:', error);
                socket.emit('errorOccurred', { errorMessage: '메시지를 불러오지 못했습니다.' });
            } else {
                const oldestMessageDate = results[0].created_at;
                socket.emit('oldestMessage', { oldestMessageDate: oldestMessageDate });
            }
        });
    });

    // DB에서 해당 방(room)의 가장 최신 메시지를 가져옴
    socket.on('loadNewestMessage', (data) => {
        const roomID = data.roomID;
        
        const query = `
            SELECT created_at
            FROM chat_message
            WHERE room_id = ?
            ORDER BY created_at DESC, message_id DESC
            LIMIT 1
        `;
        
        connection.query(
            query,
            [roomID],
            (error, results, fields) => {
            if (error) {
                console.error('Error retrieving newest message:', error);
                socket.emit('errorOccurred', { errorMessage: '메시지를 불러오지 못했습니다.' });
            } else {
                const newestMessageDate = results[0].created_at;
                socket.emit('newestMessage', { newestMessageDate: newestMessageDate });
            }
        });
    });

    /* '이전 대화 불러오기' 버튼 클릭 */
    socket.on('loadPreviousMessages', (data) => {
        const roomID = data.roomID;
        const perPage = 30; // 페이지당 보여줄 메시지 수
        const cursor = data.cursor ? new Date(data.cursor) : null;
        const query = 
        `SELECT message_id, created_at
        FROM chat_message
        WHERE room_id = ?
        ORDER BY created_at DESC, message_id DESC
        LIMIT ?`;
    
        // 1. 가장 최근 데이터 perPage만큼 조회
        connection.query(
            query,
            [roomID, perPage],
            (error, results, fields) => {
                if (error) {
                    console.error('Error retrieving latest message IDs:', error);
                    socket.emit('errorOccurred', { errorMessage: '메시지를 불러오지 못했습니다.' });
                } else {
                    const recentMessageIDs = results.map(message => message.message_id);
    
                    let query = `
                        SELECT cm.message_id, cm.message, cm.sender, cm.receiver, cm.created_at, cm.type 
                        FROM chat_message cm 
                        LEFT JOIN chat_image ci
                        ON cm.message_id = ci.message_id 
                        WHERE room_id = ?`;
    
                    let params = [roomID];
    
                    // 2. 이전 페이지의 마지막 데이터 이후의 데이터를 가져오도록 필터링
                    if (cursor) {
                        query += ` AND cm.created_at < ? AND cm.message_id NOT IN (?)`;
                        params.push(cursor, recentMessageIDs);
                    } else {
                        query += ` AND cm.message_id NOT IN (?)`;
                        params.push(recentMessageIDs);
                    }
    
                    query += ` ORDER BY cm.created_at DESC, cm.message_id DESC LIMIT ?`;
                    params.push(perPage);
    
                    connection.query(
                        query,
                        params,
                        (error, results, fields) => {
                            if (error) {
                                console.error('Error retrieving previous messages from DB:', error);
                                socket.emit('errorOccurred', { errorMessage: '메시지를 불러오지 못했습니다.' });
                            } else {
                                socket.emit('previousMessages', results);
                                console.log(results);
                                console.log(results.length);
                            }
                        }
                    );
                }
            }
        );
    });

    /* 메시지 읽음 처리 */
    socket.on('messageRead', (messageID) => {
        const query = 
        `UPDATE chat_message
        SET read_or_not = 'read',
        created_at = created_at
        WHERE message_id = ?`;

        console.log('Message ID:', messageID);

        connection.query(
            query,
            [messageID],
            (error, results, fields) => {
                if (error) {
                    console.error('Error updating read status:', error);
                    socket.emit('errorOccurred', { errorMessage: '읽음 상태를 업데이트하지 못했습니다.' });
                } else {
                    console.log('Read status updated successfully');
                }
            }
        );
        console.log('Update query executed');
    });

    /* 메시지 전송 */
    socket.on('sendMessage', function(messageData) {
        const { message, roomID, sender, receiver } = messageData;

        console.log('Message received: ' + message);
        console.log(messageData);
        
        chatUtils.createChatRoom(roomID);

        // socket.to(방이름).emit으로 특정 방의 소켓들에게 신호를 보낼 수 있다.
        socket.to(roomID).emit('RECEIVE', message, roomID);
    
        // DB에 INSERT (parameterized query 사용)
        const query = 
        `INSERT INTO chat_message (room_id, sender, receiver, message, created_at, type)
        VALUES (?, ?, ?, ?, now(), 'text')`
        connection.query(
            query,
            [roomID, sender, receiver, message],
            (error, results, fields) => {
                if (error) {
                    console.error('Error inserting message:', error);
                    socket.emit('errorOccurred', { errorMessage: '메시지를 전송하지 못했습니다.' });
                } else {
                    console.log('Message inserted successfully');
                }
            }
        )
    });

    socket.on('disconnect', () => {
        notifier.notify({
            title: 'disconnect',
            message: '연결이 끊겼습니다. 새로고침하세요.',
          });
    });

});