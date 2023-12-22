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

const connection = maria.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'chat'
});

connection.connect();

// test.js
const test = require('./routes/test')

app.use(express.static(__dirname + '/static'));

server.listen(4000, function() {
    console.log('listening on *:4000');
});

app.use("/test", test);

io.on('connection', function(socket) { // 연결이 들어오면 실행되는 이벤트
    console.log('소켓으로 접속됨.');

    // socket 변수에는 실행 시점에 연결한 상대와 연결된 소켓의 객체가 들어있다.
    
    // socket.emit으로 현재 연결한 상대에게 신호를 보낼 수 있다.
    socket.emit('usercount', io.engine.clientsCount);

    // 기본적으로 채팅방 하나에 접속시켜 준다.
    socket.join("채팅방 1");

    socket.on('SEND', function(msg, roomId) {
        // msg에는 클라이언트에서 전송한 매개변수가 들어온다. 이러한 매개변수의 수에는 제한이 없다.
        console.log('Message received: ' + msg);
        
        // socket.to(방이름).emit으로 특정 방의 소켓들에게 신호를 보낼 수 있다.
        socket.to(roomId).emit('RECEIVE', msg, roomId);

        // DB에 INSERT (parameterized query 사용)
        connection.query(
            "INSERT INTO chat_message (name, message, created_at) VALUES (?, ?, NOW())",
            ['User', msg],
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

    socket.on('image', (data)=>{
        socketList.forEach(function(item, i) {
            console.log(item.id);
            if (item != socket) {
                item.emit('image', data);
            }
        }); 
    })

    // 룸 전환 신호
    socket.on('joinRoom', (roomId, roomToJoin) => {
        socket.leave(roomId); // 기존의 룸을 나가고
        socket.join(roomToJoin);  // 들어갈 룸에 들어간다.

    // 룸을 성공적으로 전환했다는 신호 발송
    socket.emit('roomChanged', roomToJoin);
    });

    // socket.on("disconnect", function() {
    //     socketList.splice(socketList.indexOf(socket), 1);
    //     console.log("/chat 클라이언트 접속이 해제됨.");
    // });
})