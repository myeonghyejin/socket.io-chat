var emoji_id;
var emoji_info = new Object(); 
var pick_emoji = new Object();
var lo_ten;
var lo_thirty;
var font;
var color;
var exist10; 
var exist30; 
var tenchk;
var thirtychk;
var popupCheck = false;

var socket = io('http://localhost');
socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', {
        my: 'data'
    });
});

//오늘 날짜 구하는 함수
function show_date(){
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth()+1;
  var date = today.getDate();
  $("#spandate").html(year+"."+month+"."+date);
}

//위치 보여주는 함수
function show_sampletxt(pick_emoji){
  $("#sample10").html('');
  $("#sample30").html('');
  
  $('#sample10').css('top', "");
  $('#sample10').css('left', "");
  $('#sample10').css('bottom', "");
  $('#sample10').css('right', "");
  $('#sample10').css('transform', "")

  $('#sample30').css('top', "");
  $('#sample30').css('left', "");
  $('#sample30').css('bottom', "");
  $('#sample30').css('right', "");
  $('#sample30').css('transform', "")

  exist10 = pick_emoji["ten"]["exist"];
  exist30 = pick_emoji["thirty"]["exist"];
  $('#sample10').css('background-color',"rgba(102,102,102,0.5)");
  $('#sample30').css('background-color',"rgba(102,102,102,0.5)");
  if(exist10 == 1){
    lo_ten = pick_emoji["ten"]["location"];
    if(lo_ten == "좌" || lo_ten =="우"){
      $('#sample10').html("10<br>자");
    }
    else{
      $('#sample10').html("10자");
    }
    
    if(lo_ten == "상"){
      $('#sample10').css('top', "38px");
      $('#sample10').css('left', "50%");
      $('#sample10').css('transform', "translateX(-50%)");
    }
    else if(lo_ten == "하"){  
      $('#sample10').css('bottom', "38px");
      $('#sample10').css('left', "50%");
      $('#sample10').css('transform', "translateX(-50%)");
    }
    else if(lo_ten == "좌"){
      $('#sample10').css('left', "38px");
      $('#sample10').css('top', "50%");
      $('#sample10').css('transform', "translateY(-50%)");
    }
    else if(lo_ten == "우"){
      $('#sample10').css('right', "38px");
      $('#sample10').css('top', "50%");
      $('#sample10').css('transform', "translateY(-50%)");
    }
    
  }
  if(exist30 == 1){
    lo_thirty = pick_emoji["thirty"]["location"];
    if(lo_thirty == "좌" || lo_thirty =="우"){
      $('#sample30').html("30<br>자");
    }
    else{
      $('#sample30').html("30자");
    }
    if(lo_thirty == "상"){
      $('#sample30').css('top', "38px");
      $('#sample30').css('left', "50%");
      $('#sample30').css('transform', "translateX(-50%)");
    }
    else if(lo_thirty == "하"){  
      $('#sample30').css('bottom', "38px");
      $('#sample30').css('left', "50%");
      $('#sample30').css('transform', "translateX(-50%)");
    }
    else if(lo_thirty == "좌"){
      $('#sample30').css('left', "38px");
      $('#sample30').css('top', "50%");
      $('#sample30').css('transform', "translateY(-50%)");
    }
    else if(lo_thirty == "우"){
      $('#sample30').css('right', "38px");
      $('#sample30').css('top', "50%");
      $('#sample30').css('transform', "translateY(-50%)");
    }
  }
  
}

function add10(str, lo_ten){
  //10자 텍스트 추가
  $('#user_text').css('width', "auto");
  $('#user_text').css('height', "auto");
  $('#user_text').css('top', "");
  $('#user_text').css('left', "");
  $('#user_text').css('bottom', "");
  $('#user_text').css('right', ""); //위치 초기화
  
  var str2;
  if(lo_ten == "좌" || lo_ten =="우"){
    str2 = str.replace(/(.{1})/g,"$1<br/>");
  }
  else{
    str2 = str;
  }
  $('#spantxt').html(str2);
  $('#user_text').css('font-family', font);
  $('#user_text').css('color', color);
  
  if(lo_ten == "상"){
    $('#user_text').css('width', "250px");
    $('#user_text').css('top', "38px");
    $('#user_text').css('display', "flex");
    $('#user_text').css('justify-content', "center");
    $('#date').css('top', "170px");
  }
  else if(lo_ten == "하"){  
    $('#user_text').css('width', "250px");
    $('#user_text').css("top", "175px");
    $('#user_text').css('display', "flex");
    $('#user_text').css('justify-content', "center");
    $('#date').css('top', "210px");
  }
  else if(lo_ten == "좌"){
    $('#user_text').css('height', "250px");
    $('#user_text').css('left', "38px");
    $('#user_text').css('display', "flex");
    $('#user_text').css('align-items', "center");
    $('#date').css('top', "170px");
  }
  else if(lo_ten == "우"){
    $('#user_text').css('height', "250px");
    $('#user_text').css('left', "175px");
    $('#user_text').css('display', "flex");
    $('#user_text').css('align-items', "center");
    $('#date').css('top', "170px");
  }
}
function add30(str,lo_thirty){
  $('#user_text').css('width', "auto");
  $('#user_text').css('height', "auto");
  $('#user_text').css('top', "");
  $('#user_text').css('left', "");
  $('#user_text').css('bottom', "");
  $('#user_text').css('right', ""); //위치 초기화

  $('#user_text').css('writing-mode', "");

  var string2, str2;
  if(str.length > 30){
    string2 = str.substring(0, 30);
  }
  else{
    string2 = str;
  }
  if(lo_thirty == "상" || lo_thirty == "하"){
    str2 = string2.replace(/(.{10})/g,"$1<br/>");   //가로쓰기 한줄 10자 제한
  }
  if(lo_thirty == "좌" || lo_thirty == "우"){
    str2 = string2.replace(/(.{5})/g,"$1<br/>");   //세로쓰기 한줄 6자 제한
  }
   
  $('#user_text').css('font-family', font);
  $('#user_text').css('color', color);
  $('#spantxt').html(str2);
  if(lo_thirty == "상"){
      $('#user_text').css('width', "250px");
      $('#user_text').css('top', "13px");
      $('#user_text').css('display', "flex");
      $('#user_text').css('justify-content', "center");
      $('#date').css('top', "170px");
  }
  else if(lo_thirty == "하"){
    $('#user_text').css('width', "250px");
    $('#user_text').css('top', "175px");
    $('#user_text').css('display', "flex");
    $('#user_text').css('justify-content', "center");
    $('#date').css('top', "220px");
  }
  else if(lo_thirty == "좌"){
    $('#user_text').css('height', "250px");
    $('#user_text').css('display', "flex");
    $('#user_text').css('align-items', "center");
    $('#date').css('top', "170px");
  }
  else if(lo_thirty == "우"){
    $('#user_text').css('height', "250px");
    $('#user_text').css('left', "175px");
    $('#user_text').css('display', "flex");
    $('#user_text').css('align-items', "center");
    $('#date').css('top', "170px");
    $('#date').css('left', "95px");
  }
}
var chatView = document.getElementById('msg');
var chatForm = document.getElementById('chatform');

chatForm.addEventListener('submit', function() {
  var msgText = $('#input_box');
  
  if (msgText.val() == '') {
      return;
  } else {
    socket.emit('SEND', msgText.val());
      var msgLine = $('<div class="msgLine">');
      var msgBox = $('<div class="me">');
 
      msgBox.append(msgText.val());
      msgBox.css('display', 'inline-block');
      msgLine.css('text-align', 'right');
      msgLine.append(msgBox);
 
      $('#msg').append(msgLine);
      msgText.val('');
      chatView.scrollTop = chatView.scrollHeight;
    }
  });
  socket.on('SEND', function(msg) {
    var msgLine = $('<div class="msgLine">');
    var msgBox = $('<div class="msgBox">');

    msgBox.append(msg);
    msgBox.css('display', 'inline-block');

    msgLine.append(msgBox);
    $('#msg').append(msgLine);

    chatView.scrollTop = chatView.scrollHeight;
});


var imgwidth;
var imgheight;
//이미지 보내는 함수
$(function(){          
  $("#save").click(function() {
      var spnwidth = $("#spantxt").width();
      var spnheight = $("#spantxt").height();
      if(tenchk == 1) {
        if(lo_ten == '상' || lo_ten == '하') {
          imgheight = 120 + spnheight + 30;
          imgwidth = Math.max(120, spnwidth)+5;
        }
        else if(lo_ten == '좌' || lo_ten == '우'){
          imgheight = Math.max(120, spnheight)+5;
          imgwidth = 120 + spnwidth  + 30;
        }
      }

      else if(thirtychk == 1) {
        if(lo_thirty == '상' || lo_thirty == '하') {
          imgheight = 120 + spnheight + 30;
          imgwidth = Math.max(120, spnwidth)+5;
        }
        else if(lo_thirty == '좌' || lo_thirty == '우') {
          imgheight = Math.max(120, spnheight)+5;
          imgwidth = 120 + spnwidth  + 30;
        }
      }
      else {
        imgheight = 120;
        imgwidth = 120;
      }
      
      console.log(imgwidth);
      console.log(imgheight);
      const img = document.createElement('img');
      var check = 0;

       html2canvas($("#emoji_div"), {
           onrendered: function(canvas) {
               canvas.toBlob((blob) => {
                var url = URL.createObjectURL(blob);
                img.src = url;
                img.onload = function() {
                  if(check == 0) {
                    cropImage(
                      this, {
                      x : (250 - imgwidth)/2,     
                      y : (250 - imgheight)/2,
                      width : imgwidth,
                      height : imgheight,
                      }, spnwidth, spnheight);
                      check = 1;
                   }
                };
                
                sendEmoji(img);
                check = 0;
             });    
                
           }
       });
       $("#custom_emoji").css({"display":"none"});
       $("#emo").detach();
       $("#spantxt").html("");
       $("#input_box").val("");
   });
});
const dataURLtoFile = (dataurl, fileName) => {
  var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), 
      n = bstr.length, 
      u8arr = new Uint8Array(n);
      
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], fileName, {type:mime});
}



function cropImage(image, croppingCoords, sw,sh) {
  var cc = croppingCoords;
  var workCan = document.createElement("canvas");
  workCan.width = Math.floor(cc.width); 
  workCan.height = Math.floor(cc.height);
  var ctx = workCan.getContext("2d");    
  var cutx=0, cuty=0;
  if(tenchk == 1) {
    if(lo_ten == '상') cuty = sh;
    else if(lo_ten == '하') cuty = -sh;
    else if(lo_ten == '우') cutx = -sw;
    else if(lo_ten == '좌') cutx = sw;
  }
  else if(thirtychk == 1) {
    if(lo_thirty == '상') cuty = sh;
    else if(lo_thirty == '하') cuty = -sh;
    else if(lo_thirty == '우') cutx = -sw;
    else if(lo_thirty == '좌') cutx = sw;
  
    if(lo_thirty == '좌' || lo_thirty == '우'){
      cutx /= 2;
    }
    else if(lo_thirty == '상' || lo_thirty == '하'){
      cuty /= 2;
    }
  }
  ctx.drawImage(image,-Math.floor(cc.x)+cutx, -Math.floor(cc.y)+cuty); // draw the image offset to place it correctly on the cropped region
  image.src = workCan.toDataURL();       // set the image source to the canvas as a data URL
  tenchk = 0;
  thirtychk = 0;

  var file = dataURLtoFile(image.src, '1.png');
  var formData = new FormData();
  formData.append("image", file);
  
  $.ajax({
    url : 'http://127.0.0.1:4000/image',
    type : 'POST',
    method : "POST",
    timeout : 0,
    processData : false,
    mimeType : "multipart/form-data",
    contentType: false,
    data: formData,
    success: function(data){
      socket.emit('image', data);
    },
    error: function(e){
      console.log("ERROR: ", e);
    }
  });
  return image;
}