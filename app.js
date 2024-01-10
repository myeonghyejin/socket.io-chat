const express = require('express');
const socket = require('socket.io');

const app = express();
app.set('port', process.env.PORT || 4000);
app.use(express.static(__dirname + '/static'));

const http = require('http');
const server = http.createServer(app);

/* 기본 namespace */
const io = socket(server);

/* DB Connect */
const connection = require('./database/connect/maria')
connection.connect();

/* 이미지 업로드 설정 */
const multer = require('multer');
const uuid4 = require('uuid4');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'static/upload'));
    },
    filename: (req, file, cb) => {
        const randomID = uuid4();
        const ext = path.extname(file.originalname);
        const name = randomID + ext;
        cb(null, name);
    }
});

// 이미지 파일로 제한, 확장자를 확인하는 필터 함수
const imageFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
        cb(new Error('이미지 파일만 업로드할 수 있습니다.'), false);
    } else {
        cb(null, true);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: imageFilter
});

/* 이미지 저장 함수들 */
async function saveImageToDB(messageID, imagePath) {
    try {
        await connection.query("INSERT INTO chat_image (message_id, image_path) VALUES (?, ?)", [messageID, imagePath]);
        console.log('이미지 경로를 데이터베이스에 저장했습니다.');
    } catch (error) {
        throw new Error('이미지 경로를 데이터베이스에 저장하는 중 오류가 발생했습니다.');
    }
}

app.post('/upload', upload.array('imgs', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('이미지를 선택하세요.');
    }

    const { roomID, sender, receiver } = req.body;

    try {
        const imagePaths = [];

        for (const file of req.files) {
            const imagePath = path.join('../upload', file.filename);
            imagePaths.push(imagePath);

            connection.query(
                "INSERT INTO chat_message (room_id, sender, receiver, message, created_at, type) VALUES (?, ?, ?, ?, now(), 'image')",
                [roomID, sender, receiver, imagePath],
                async (error, results, fields) => {
                    if (error) {
                        console.error('이미지 정보 저장 중 오류 발생:', error);
                        res.status(500).send('이미지 정보 저장 중 오류 발생');
                    } else {
                        const messageID = results.insertId; // 저장된 메시지의 ID
                        
                        await saveImageToDB(messageID, imagePath); // 이미지를 DB에 저장하는 함수
                    }
                }
            )
        }

        res.status(200).json({ imagePaths }); // JSON 응답 반환
        console.log(imagePaths);
        console.log(__dirname);
    } catch (err) {
        console.error('이미지 업로드 중 오류 발생:', err);
        res.status(500).send('이미지 업로드 중 오류 발생');
    }
});

/* 서버 시작 */
server.listen(4000, function() {
    console.log('listening on *:4000');
});

/* test.js */
// const test = require('./routes/test')
// app.use("/test", test);

/* 룸 ID 생성 함수 */
function generateRoomID(sender, receiver) {
    const sortedIDs = [sender, receiver].sort().join('-'); // 사용자 ID 정렬하여 결합
    return sortedIDs; // 룸 ID 반환
}

/* 채팅방 생성 함수 */
function createChatRoom(roomID) {
    connection.query(
        "INSERT IGNORE INTO chat_room (room_id, created_at) VALUES (?, now())",
        [roomID],
        (error, results, fields) => {
            if (error) {
                console.error('Error creating chat room:', error);
                // 에러 핸들링 또는 적절한 조치
            } else {
                console.log('Chat room created successfully');
            }
        }
    );
}

io.on('connection', (socket) => {
    socket.on("LOGIN", async (sender, receiver)=>{
        console.log(sender, receiver);

        // 클라이언트로 roomID 전송
        const roomID = generateRoomID(sender, receiver);

        // 현재 소켓의 모든 룸을 나가고 새로운 룸에 조인
        Object.keys(socket.rooms).forEach((room) => {
            if (room !== socket.id) {
                socket.leave(room);
            }
        });

        socket.join(roomID); // 선택한 룸에 조인

        console.log(`Socket ${socket.id} joined room ${roomID}`);

        // 룸을 성공적으로 전환했다는 신호 발송
        io.to(socket.id).emit('roomChanged', roomID);

        // DB에서 해당 룸의 메시지 가져와 클라이언트에게 전송
        const perPage = 30;

        connection.query(
            `SELECT *
            FROM (
                SELECT cm.message_id, cm.message, cm.sender, cm.receiver, cm.created_at, cm.type 
                FROM chat_message cm 
                LEFT JOIN chat_image ci ON cm.message_id = ci.message_id 
                WHERE room_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            ) AS sub
            ORDER BY created_at ASC`,
            [roomID, perPage],
            (error, results, fields) => {
                if (error) {
                    console.error('Error retrieving messages from DB:', error);
                } else {
                    // 클라이언트에 데이터 전송
                    socket.emit('GET', results); // 가져온 메시지 전송
                }
            }
        );
    });

    socket.on('loadOldestMessage', (data) => {
        const roomID = data.roomID;
        
        // DB에서 해당 방(room)의 가장 오래된 메시지를 가져오는 쿼리
        const query = `
            SELECT created_at
            FROM chat_message
            WHERE room_id = ?
            ORDER BY created_at ASC
            LIMIT 1
        `;
        
        connection.query(query, [roomID], (error, result) => {
            if (error) {
                console.error('Error retrieving oldest message:', error);
                // 에러를 클라이언트에 보내거나 처리할 수 있습니다.
            } else {
                const oldestMessageDate = result[0].created_at;
                socket.emit('oldestMessage', { oldestMessageDate: oldestMessageDate });
            }
        });
    });

    /* '이전 대화 불러오기' 버튼 클릭 */
    socket.on('loadPreviousMessages', (data) => {
        const roomID = data.roomID;
        const perPage = 30; // 페이지당 보여줄 메시지 수
        const cursor = data.cursor ? new Date(data.cursor) : null;
    
        // 1. 가장 최근 데이터 perPage만큼 조회
        connection.query(
            `SELECT message_id, created_at FROM chat_message WHERE room_id = ? ORDER BY created_at DESC LIMIT ?`,
            [roomID, perPage],
            (error, recentMessages) => {
                if (error) {
                    console.error('Error retrieving latest message IDs:', error);
                } else {
                    const recentMessageIDs = recentMessages.map(message => message.message_id);
    
                    let query = `
                        SELECT cm.message_id, cm.message, cm.sender, cm.receiver, cm.created_at, cm.type 
                        FROM chat_message cm 
                        LEFT JOIN chat_image ci ON cm.message_id = ci.message_id 
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
    
                    query += ` ORDER BY cm.created_at DESC LIMIT ?`;
                    params.push(perPage);
    
                    connection.query(
                        query,
                        params,
                        (error, results, fields) => {
                            if (error) {
                                console.error('Error retrieving previous messages from DB:', error);
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

    /* 메시지 전송 */
    socket.on('SEND', function(messageData) {
        const { message, roomID, sender, receiver } = messageData;

        console.log('Message received: ' + message);
        console.log(messageData);
        
        createChatRoom(roomID);

        // socket.to(방이름).emit으로 특정 방의 소켓들에게 신호를 보낼 수 있다.
        socket.to(roomID).emit('RECEIVE', message, roomID);
    
        // DB에 INSERT (parameterized query 사용)
        connection.query(
            "INSERT INTO chat_message (room_id, sender, receiver, message, created_at, type) VALUES (?, ?, ?, ?, now(), 'text')",
            [roomID, sender, receiver, message],
            (error, results, fields) => {
                if (error) {
                    // INSERT 중 에러 발생 시 처리
                    console.error('Error inserting message:', error);
                    // 에러 핸들링 또는 적절한 조치
                } else {
                    // INSERT 성공 시 처리
                    console.log('Message inserted successfully');
                }
            }
        )
    });
    
    /* 룸 전환 신호 */
    socket.on('joinRoom', (roomToJoin) => {
        const currentRooms = Object.keys(socket.rooms);
        currentRooms.forEach((room) => {
            if (room !== socket.id) {
                socket.leave(room); // 모든 룸에서 나가고
            }
        });
    
        socket.join(roomToJoin); // 선택한 룸에 조인
    
        console.log(`Socket ${socket.id} joined room ${roomToJoin}`);
        // 룸을 성공적으로 전환했다는 신호 발송
        io.to(socket.id).emit('roomChanged', roomToJoin); // 클라이언트로 roomToJoin 값을 보내 줌
    });

});