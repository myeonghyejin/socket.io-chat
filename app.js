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
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'upload'));
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
async function saveImageToDB(imagePath) {
    try {
        await connection.query("INSERT INTO chat_image (image_path) VALUES (?)", [imagePath]);
        console.log('이미지 경로를 데이터베이스에 저장했습니다.');
    } catch (error) {
        throw new Error('이미지 경로를 데이터베이스에 저장하는 중 오류가 발생했습니다.');
    }
}

async function saveImageToDB(imagePath) {
    try {
        const result = await connection.query("INSERT INTO chat_image (image_path) VALUES (?)", [imagePath]);
        console.log('이미지 경로를 데이터베이스에 저장했습니다.', result);
    } catch (error) {
        console.error('이미지 경로를 데이터베이스에 저장하는 중 오류가 발생했습니다:', error);
        throw new Error('이미지 경로를 데이터베이스에 저장하는 중 오류가 발생했습니다.');
    }
}

// 이미지 파일 업로드하는 라우트 설정
app.post('/upload', upload.array('imgs', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('이미지를 선택하세요.');
    }

    try {
        const imagePaths = [];

        for (const file of req.files) {
            const imagePath = path.join(__dirname, 'upload', file.filename);
            imagePaths.push(imagePath);
            // 데이터베이스에 이미지 경로 저장 또는 다른 작업 수행
            await saveImageToDB(imagePath);
        }

        res.status(200).send('이미지 업로드 완료');
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
function generateRoomID(senderID, receiverID) {
    const sortedIDs = [senderID, receiverID].sort().join('-'); // 사용자 ID 정렬하여 결합
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
    socket.on("LOGIN", async (senderID, receiverID)=>{
        console.log(senderID, receiverID);

        // 클라이언트로 roomID 전송
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

    /* 이미지 업로드 및 데이터베이스 저장 */
    socket.on('IMAGE', async (data) => {
        try {
            const imagePath = await saveImageToFS(data); // 파일 시스템에 이미지 저장
            await saveImageToDB(imagePath); // 데이터베이스에 이미지 경로 저장

            // 저장 후에 클라이언트에 이미지 경로 전송
            io.emit('imagePath', { path: imagePath });
        } catch (err) {
            console.error('이미지 업로드 및 저장 중 오류 발생:', err);
        }
    });

});