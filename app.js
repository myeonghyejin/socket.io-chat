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
const maria = require('mysql');
const connection = require('./database/connect/maria')
connection.connect();

// test.js
const test = require('./routes/test')

app.use(express.static(__dirname + '/static'));

server.listen(4000, function() {
    console.log('listening on *:4000');
});

app.use("/test", test);

// 룸ID 생성 함수
function generateRoomID(userID1, userID2) {
    const sortedIDs = [userID1, userID2].sort().join('-'); // 사용자 ID 정렬하여 결합
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
    /* 룸 접속 */
    socket.on('joinRoom', (roomToJoin) => {
        const currentRooms = Object.keys(socket.rooms);
        currentRooms.forEach((room) => {
            if (room !== socket.id) {
                socket.leave(room); // 모든 룸에서 나가고
            }
        });

        socket.join('채팅방 1');

        //     // const currentUserID = 'user123'; // 현재 사용자의 ID
        //     // const roomID = generateRoomID(currentUserID, receiverUserId); // 룸 ID 생성

        //     socket.join(roomToJoin); // 선택한 룸에 조인

        console.log(`Socket ${socket.id} joined room ${roomToJoin}`);
        // 룸을 성공적으로 전환했다는 신호 발송
        io.to(socket.id).emit('roomChanged', roomToJoin); // 클라이언트로 roomToJoin 값을 보내 줌
    });

    /* 메시지 전송 */
    socket.on('SEND', function(msg, roomID) {
        // msg에는 클라이언트에서 전송한 매개변수가 들어온다. 이러한 매개변수의 수에는 제한이 없다.
        console.log('Message received: ' + msg);
        
        createChatRoom(roomID);

        // socket.to(방이름).emit으로 특정 방의 소켓들에게 신호를 보낼 수 있다.
        socket.to(roomID).emit('RECEIVE', msg, roomID);
    
        // DB에 INSERT (parameterized query 사용)
        connection.query(
            "INSERT INTO chat_message (room_id, sender, receiver, message, created_at) VALUES (?, ?, ?, ?, NOW())",
            [roomID, 'sender', 'receiver', msg],
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