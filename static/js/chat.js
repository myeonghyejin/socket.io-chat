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

document.addEventListener('DOMContentLoaded', function() {
    // 아이디 입력
    const askUserID = () => {
        senderID = window.prompt("수신자 아이디를 입력하세요.");
        console.log(senderID);

        receiverID = window.prompt("송신자 아이디를 입력하세요.");
        console.log(receiverID);

        // 아이디를 서버로 전달
        socket.emit("LOGIN", senderID, receiverID, (res) => {
            console.log(res);
        });
    };

    askUserID();
});


// 클라이언트 측 소켓 이벤트 처리
socket.on('GET', (chatMessage) => {
    const msgContainer = $('#msg');
    
    chatMessage.forEach((msg) => {
        const msgLine = $('<div>').addClass('msgLine');
        let msgBox;

        if (msg.type === 'text') {
            msgBox = $('<div>').addClass('msgBox').text(msg.message);
        } else if (msg.type === 'image') {
            const imgElement = document.createElement('img');
            imgElement.src = msg.message; // 이미지 경로 설정
            imgElement.classList.add('uploaded-image');

            const imgWrapper = $('<div>').addClass('image-wrapper'); // 외부 div 생성
            imgWrapper.append(imgElement); // 이미지를 외부 div 안에 추가

            imgElement.onclick = function() {
                window.open(this.src); // 이미지 클릭 시 이미지 주소를 새 창으로 열기
            };

            msgBox = $('<div>').addClass('msgBox').append(imgWrapper);
        }

        if (msg.sender === senderID) {
            msgBox.addClass('me'); // 보낸 사람 스타일 클래스 추가
            msgBox.css('display', 'inline-block');
            msgLine.css('text-align', 'right');
        } else {
            msgBox.css('display', 'inline-block');
        }
            
        msgLine.append(msgBox);
        msgContainer.append(msgLine);
    });
});

// 메시지 전송
chatForm.addEventListener('submit', function() {
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

// 이미지 전송
function uploadImages() {
    const formData = new FormData();
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;

    formData.append('roomID', roomID);
    formData.append('sender', senderID);
    formData.append('receiver', receiverID);
    
    for (let i = 0; i < files.length; i++) {
        formData.append('imgs', files[i]);
    }

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('이미지 업로드 결과:', data);

        // 업로드한 이미지를 화면에 표시
        const msgContainer = $('#msg');
        const msgLine = $('<div>').addClass('msgLine');
        let msgBox;
        data.imagePaths.forEach(imagePath => {
            const imgElement = document.createElement('img'); // 이미지 요소 생성
            imgElement.src = imagePath;
            imgElement.classList.add('uploaded-image');

            const imgWrapper = $('<div>').addClass('image-wrapper'); // 외부 div 생성
            imgWrapper.append(imgElement); // 이미지를 외부 div 안에 추가

            // 이미지에 onclick 이벤트 핸들러 추가
            imgElement.onclick = function() {
                window.open(this.src); // 이미지 클릭 시 이미지 주소를 새 창으로 열기
            };

            msgBox = $('<div>').addClass('msgBox').append(imgWrapper);
            msgBox.addClass('me');
            msgBox.css('display', 'inline-block');
            msgLine.css('text-align', 'right');
            msgLine.append(msgBox);
            msgContainer.append(msgLine);
        });
    })
    .catch(error => {
        console.error('이미지 업로드 중 오류 발생:', error);
    });
}

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