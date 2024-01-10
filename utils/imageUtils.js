const multer = require('multer');
const uuid4 = require('uuid4');
const path = require('path');
const connection = require('../database/connect/maria');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../static/upload'));
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

/* DB에 저장 */
async function saveImageToChatMessage(roomID, sender, receiver, imagePath) {
    return new Promise((resolve, reject) => {
        connection.query(
            "INSERT INTO chat_message (room_id, sender, receiver, message, created_at, type) VALUES (?, ?, ?, ?, now(), 'image')",
            [roomID, sender, receiver, imagePath],
            async (error, results, fields) => {
                if (error) {
                    console.error('이미지 정보 저장 중 오류 발생:', error);
                    reject('이미지 정보 저장 중 오류 발생');
                } else {
                    const messageID = results.insertId; // 저장된 메시지의 ID
                    await saveImageToChatImage(messageID, imagePath); // 이미지를 DB에 저장하는 함수
                    resolve();
                }
            }
        )
    });
}

async function saveImageToChatImage(messageID, imagePath) {
    try {
        await connection.query("INSERT INTO chat_image (message_id, image_path) VALUES (?, ?)", [messageID, imagePath]);
        console.log('이미지 경로를 데이터베이스에 저장했습니다.');
    } catch (error) {
        throw new Error('이미지 경로를 데이터베이스에 저장하는 중 오류가 발생했습니다.');
    }
}

module.exports = { upload, saveImageToChatMessage, saveImageToChatImage };