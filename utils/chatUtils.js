const connection = require('../database/connect/maria');

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
                socket.emit('errorOccurred', { errorMessage: '채팅방에 접속하지 못했습니다.' });
            } else {
                console.log('Chat room created successfully');
            }
        }
    );
}

module.exports = { generateRoomID, createChatRoom };