let chatView = document.getElementById('msg');
let chatForm = document.getElementById('chatform');

let senderID;
let receiverID;
let roomID;

let socket = io();
socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', {
        my: 'data'
    });
});

// socket.on 함수로 서버에서 전달하는 신호를 수신
// socket.on('usercount', (count) => {
//     let userCounter = document.getElementById('usercount');
//     userCounter.innerText = "현재 " + count + "명이 서버에 접속해 있습니다.";
// });

document.addEventListener('DOMContentLoaded', function() {
    // 아이디 입력
    const askUserID = () => {
        // senderID = window.prompt("수신자 아이디를 입력하세요.");
        console.log(senderID);

        // receiverID = window.prompt("송신자 아이디를 입력하세요.");
        console.log(receiverID);

        // 아이디를 서버로 전달
        socket.emit("LOGIN", senderID, receiverID, (res) => {
            console.log(res);
        });
    };

    askUserID();
});

chatForm.addEventListener('submit', function(event) {
    // event.preventDefault(); // 기본 이벤트 제거
    let msgText = $('#input_box');

    if (msgText.val() == '') {
        return;
    } else {
        // 클라이언트에서 메시지 전송 신호를 서버로 발송
        const messageData = {
            msg: msgText.val(),
            roomID: roomID,
            sender: senderID,
            receiver: receiverID
        };

        socket.emit('SEND', messageData);

        let msgLine = $('<div class="msgLine">');
        let msgBox = $('<div class="me">');

        msgBox.append(msgText.val());
        msgBox.css('display', 'inline-block');

        msgLine.css('text-align', 'right');
        msgLine.append(msgBox);

        $('#msg').append(msgLine);
        msgText.val('');
        chatView.scrollTop = chatView.scrollHeight;
    }
});

socket.on('RECEIVE', function(msg) {
    let msgLine = $('<div class="msgLine">');
    let msgBox = $('<div class="msgBox">');

    let receivedRoom = roomID;
    let receivedMessage = msg;

    if (receivedRoom === roomID) {
        msgBox.append(receivedMessage);
        msgBox.css('display', 'inline-block');

        msgLine.append(msgBox);
        $('#msg').append(msgLine);

        chatView.scrollTop = chatView.scrollHeight;
    }
});


// 클라이언트 측 소켓 이벤트 처리
socket.on('GET', (chatMessage) => {
    const msgContainer = $('#msg');
    
    chatMessage.forEach((msg) => {
        const msgLine = $('<div>').addClass('msgLine');
        let msgBox = $('<div>').addClass('msgBox').text(msg.message); // 메시지 내용 추가

        if (msg.sender === senderID) {
            msgBox = $('<div>').addClass('me').text(msg.message); // 메시지 내용 추가
            msgBox.css('display', 'inline-block');
            msgLine.css('text-align', 'right');
        } else {
            msgBox.css('display', 'inline-block');
        }
            
        msgLine.append(msgBox);
        msgContainer.append(msgLine);
    });
});

// 룸 접속 버튼 클릭 시
function joinRoom(roomID) {
    // 클라이언트에서 방 접속 신호를 서버로 발송
    socket.emit('joinRoom', roomID);
}

// 접속한 룸이 바뀌었을 때
socket.on('roomChanged', (joinedRoom) => {
    roomID = joinedRoom;
    document.getElementById('msg').innerHTML = joinedRoom + "에 접속했습니다.";
});