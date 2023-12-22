const express = require('express');
const socket = require('socket.io');
const upload = require('multer');

const app = express();
app.set('port', process.env.PORT || 4000);

const http = require('http');
const server = http.createServer(app);

// 기본 namespace
const io = socket(server);

// mariaDB Connect
const maria = require('./database/connect/maria');
maria.connect();

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

    socket.on('SEND', function(msg, roomname) {
        // msg에는 클라이언트에서 전송한 매개변수가 들어온다. 이러한 매개변수의 수에는 제한이 없다.
        console.log('Message received: ' + msg);
        
        // io.to(방이름).emit으로 특정 방의 소켓들에게 신호를 보낼 수 있다.
        io.to(roomname).emit('SEND', msg);
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
    socket.on('joinRoom', (roomname, roomToJoin) => {
        socket.leave(roomname); // 기존의 룸을 나가고
        socket.join(roomToJoin);  // 들어갈 룸에 들어간다.

    // 룸을 성공적으로 전환했다는 신호 발송
    socket.emit('roomChanged', roomToJoin);
    });

    // socket.on("disconnect", function() {
    //     socketList.splice(socketList.indexOf(socket), 1);
    //     console.log("/chat 클라이언트 접속이 해제됨.");
    // });
})