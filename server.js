var express = require('express');
const path = require('path');
var app = express();

var server = require('http').createServer(app);
/*
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});
*/
app.use(express.static(path.join(__dirname, 'views')));

app.get("/data",function(req,res){
    db.all("SELECT * FROM meeting", (err, row) => {
        console.log(row);
        res.json( row );
    });
});

app.get("/vote/:meeting/:question",function(req,res){
    var meeting = req.params.meeting;
    var question = req.params.question;
    console.log(meeting,question);
    var kinds = [];
    var kindsNumber = [];
    var sentence = "SELECT * FROM vote WHERE meeting == " + meeting + " AND " + "question == " + question;
    console.log(sentence);
    db.all(sentence, (err, row) => {
        console.log(row);
        var data = {
            agr: 0,
            oop: 0,
            other: 0,
        };
        if (row != undefined){
            for (var i=0;i<row.length;i++){
                var k = row[i].kinds;

                if ( !kinds.includes(k) ){
                    kinds.push(k);
                }
            }
            var count;
            for (var i=0;i<kinds.length;i++){
                count = 0;
                var n = kinds[i];
                for (var j=0;j<row.length;j++){
                    if (row[j].kinds == n ){
                        count++;
                    }
                }
                kindsNumber.push(count);

                data[n] = count;
            }
            console.log(kinds,kindsNumber);
        }

        data["kinds"] = kinds;
        data["kindsNumber"] = kindsNumber;
        res.json( data );
    });
});

app.get("/question/:id",function(req,res){
    var meeting = req.params.id;
    console.log(meeting);
    db.all("SELECT * FROM question WHERE meeting == " + meeting, (err, row) => {
        console.log(row);
        res.json( row );
    });
});
app.get("/comOK/:meeting/:question",function (req,res){
    console.log(comOK);

    var meeting = req.params.meeting;
    var question = req.params.question;

    var OK = false;

    for(var i=0;i<comOK.length;i++){
        if (comOK[i].meeting == meeting && comOK[i].question == question ){
            OK = comOK[i].OK;
            break;
        }
    }

    res.send(OK);
});
app.get("/com/:meeting/:question",function (req,res){
    var meeting = req.params.meeting;
    var question = req.params.question;

    db.all("SELECT * FROM comment WHERE meeting==? AND question== ?",[meeting,question], (err, row) => {
        console.log(row);
        res.json( row );
    });
});

var comOK = [];

const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("./data.db");

var io = require('socket.io')(server);

io.on('connection', function(socket){
  socket.on('meeting', function(msg){
    console.log(msg);
    db.serialize(() => {
        db.run('INSERT INTO meeting (name) VALUES (?)', [msg] );
        io.emit('meeting', "update");
    });
  });

  socket.on('question', function(msg){
    console.log(msg);
    db.serialize(() => {
        db.run('INSERT INTO question (value,meeting) VALUES (?,?)', [msg.value,msg.id] );
        io.emit('question', "update");
    });
  });

  socket.on('vote', function(msg){
    console.log(msg);
    db.serialize(() => {
        db.run('INSERT INTO vote (kinds,meeting,question) VALUES (?,?,?)', [msg.kind,msg.meet,msg.question] );
        io.emit('vote', "update");
    });
  });
  socket.on('comOK',function (msg){
        console.log("comOK");

        var done = false;
        for(var i=0;i<comOK.length;i++){
            if (comOK[i].meeting == msg.meeting && comOK[i].question == msg.question ){
                comOK[i].OK = msg.OK;
                done = true;
                break;
            }
        }
        if (!done){
            comOK.push(msg);
        }
        io.emit("comOK",msg);
  } );

  socket.on("com",function(msg){
        console.log(msg);
        db.run('INSERT INTO comment (value,meeting,question) VALUES (?,?,?)', [msg.value,msg.meeting,msg.question] );

        io.emit("com","update");
    });
 
});

var port = 3000;
console.log("localhost:" + port);  
server.listen(port);