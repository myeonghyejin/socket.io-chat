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
    const chat = document.querySelector('.chat');
    const send = document.querySelector('.send');

    function adjustChatHeight() {
        const sendHeight = send.offsetHeight;
        chat.style.bottom = sendHeight + 'px';
    }

    adjustChatHeight(); // 페이지 로드 시 높이 조절

    // 창 크기가 변경될 때 높이 재조정
    window.addEventListener('resize', () => {
        adjustChatHeight();
    });

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
    
    chatMessage.forEach((msg, index) => {
        const msgLine = $('<div>').addClass('msgLine');
        let msgBox;

        const date = new Date(msg.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' });
        let dateBox;

        if (msg.type === 'text') {
            msgBox = $('<div>').addClass('received-text-message').text(msg.message);
            dateBox = $('<div>').addClass('dateBox').text(date);

            if (msg.sender === senderID) {
                msgBox.removeClass('received-text-message').addClass('sent-text-message');
                msgBox.css('display', 'inline-block');
                msgLine.css('text-align', 'right');
            } else {
                msgBox.css('display', 'inline-block');
            }

        } else if (msg.type === 'image') {
            const imgElement = document.createElement('img');
            imgElement.src = msg.message; // 이미지 경로 설정
            imgElement.classList.add('uploaded-image');

            const imgWrapper = $('<div>').addClass('image-wrapper'); // 외부 div 생성
            imgWrapper.append(imgElement); // 이미지를 외부 div 안에 추가

            imgElement.onclick = function() {
                window.open(this.src); // 이미지 클릭 시 이미지 주소를 새 창으로 열기
            };

            msgBox = $('<div>').addClass('received-image-message').append(imgWrapper);
            dateBox = $('<div>').addClass('dateBox').text(date);

            if (msg.sender === senderID) {
                msgBox.removeClass('received-image-message').addClass('sent-image-message');
                msgBox.css('display', 'inline-block');
                msgLine.css('text-align', 'right');
            } else {
                msgBox.css('display', 'inline-block');
            }

        }
            
        msgLine.append(msgBox, dateBox);
        msgContainer.append(msgLine);

        // 모든 메시지를 처리한 후에 스크롤을 맨 아래로 이동
        if (index === chatMessage.length - 1) {
            console.log($('#msg'))
            msgContainer.scrollTop(msgContainer.prop('scrollHeight'));
        }
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
        let msgBox = $('<div class="sent-text-message">');

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
    let msgBox = $('<div class="received-text-message">');

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
document.getElementById('fileInput').addEventListener('change', function() {
    const files = document.getElementById('fileInput').files;
    uploadFiles(files);
});

function uploadFiles(files) {
    const formData = new FormData();
    const xhr = new XMLHttpRequest();

    formData.append('roomID', roomID);
    formData.append('sender', senderID);
    formData.append('receiver', receiverID);

    for (let i = 0; i < files.length; i++) {
        formData.append('imgs', files[i]);
    }

    xhr.open('POST', '/upload', true);

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            displayImages(data.imagePaths); // 이미지를 표시하는 함수 호출
        }
    };

    xhr.send(formData);
}

function displayImages(imagePaths) {
    const msgContainer = $('#msg');
    const msgLine = $('<div>').addClass('msgLine');

    imagePaths.forEach(imagePath => {
        const imgElement = document.createElement('img');
        imgElement.src = imagePath;
        imgElement.classList.add('uploaded-image');

        const imgWrapper = $('<div>').addClass('image-wrapper');
        imgWrapper.append(imgElement);

        imgElement.onclick = function() {
            window.open(this.src);
        };

        const msgBox = $('<div>').addClass('received-image-message').append(imgWrapper);
        msgBox.removeClass('received-image-message').addClass('sent-image-message');
        msgBox.css('display', 'inline-block');
        msgLine.css('text-align', 'right');
        msgLine.append(msgBox);
        msgContainer.append(msgLine);

        msgContainer.scrollTop(msgContainer.prop('scrollHeight'));
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
    // document.getElementById('system').innerHTML = joinedRoom + "에 접속했습니다.";
});