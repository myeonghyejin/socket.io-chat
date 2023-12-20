const express = require('express');
const socket = require('socket.io');
const upload = require('multer');

const app = express();
app.set('port', process.env.PORT || 4000);

const http = require('http');
const server = http.createServer(app);
const io = socket(server); 

let socketList = [];

app.use(express.static(__dirname + '/static'));

server.listen(4000, function() {
    console.log('listening on *:4000');
});

io.on('connection', function(socket) {
    socketList.push(socket);
    console.log('소켓으로 접속됨.');

    socket.on('SEND', function(msg) {
        socketList.forEach(function(item, i) {
            console.log(item.id);
            if (item != socket) {
                item.emit('SEND', msg);
            }
        }); 
    });

    socket.on('image', (data)=>{
        socketList.forEach(function(item, i) {
            console.log(item.id);
            if (item != socket) {
                item.emit('image', data);
            }
        }); 
    })

    socket.on("disconnect", function() {
        socketList.splice(socketList.indexOf(socket), 1);
        console.log("/chat 클라이언트 접속이 해제됨.");
    });
})

// app.post( '/image', upload.single("image"), function(req, res, next) {
//     try {
//       console.log(req.file)
//       var data = req.file;
//       res.send(data.location);
//     } catch (error) {
//       console.error(error);
//       next(error);
//     }
// }); 

// app.get('/', function(req, res){
//     res.sendfile('index.html');
// });

// io.on('connection', function(socket){
//     socket.on('chat message', function(msg){
//         io.emit('chat message', msg);
//     });
//   });
  
// http.listen(3000, function(){
//     console.log('listening on *:3000');
// });