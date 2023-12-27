const express = require('express');
const socket = require('socket.io');
const upload = require('multer');

const app = express();
app.set('port', process.env.PORT || 4000);

const http = require('http');
const server = http.createServer(app);

// 기본 namespace
const io = socket(server);

// DB Connect
const connection = require('./database/connect/maria')
connection.connect();

// test.js
const test = require('./routes/test')

app.use(express.static(__dirname + '/static'));

server.listen(4000, function() {
    console.log('listening on *:4000');
});

app.use("/test", test);

// 룸 ID 생성 함수
function generateRoomID(senderID, receiverID) {
    const sortedIDs = [senderID, receiverID].sort().join('-'); // 사용자 ID 정렬하여 결합
    return sortedIDs; // 룸 ID 반환
}

// 채팅방 생성 함수
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
    socket.on("LOGIN", async (senderID, receiverID)=>{
        console.log(senderID, receiverID);

        const roomID = generateRoomID(senderID, receiverID);

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
        connection.query("select message_id, message, sender, receiver, created_at from chat_message where room_id = ? order by message_id asc", [roomID], (error, results, fields) => {
            if (error) {
                console.error('Error retrieving messages from DB:', error);
            } else {
                // 클라이언트에 데이터 전송
                socket.emit('GET', results); // 가져온 메시지 전송
            }
        });
    });

    /* 메시지 전송 */
    socket.on('SEND', function(messageData) {
        const { msg, roomID, sender, receiver } = messageData;

        console.log('Message received: ' + msg);
        
        createChatRoom(roomID);

        // socket.to(방이름).emit으로 특정 방의 소켓들에게 신호를 보낼 수 있다.
        socket.to(roomID).emit('RECEIVE', msg, roomID);
    
        // DB에 INSERT (parameterized query 사용)
        connection.query(
            "INSERT INTO chat_message (room_id, sender, receiver, message, created_at) VALUES (?, ?, ?, ?, NOW())",
            [roomID, sender, receiver, msg],
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
    
    /* 이미지 전송 */
    socket.on('image', (data)=>{
        socketList.forEach(function(item, i) {
            console.log(item.id);
            if (item != socket) {
                item.emit('image', data);
            }
        }); 
    })
    
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