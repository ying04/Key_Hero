window.addEventListener("keydown", (e) => {
    e.preventDefault()
}, { passive: false })

const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

canvas.width = window.innerWidth * 0.9
canvas.height = window.innerHeight * 0.65

const width = canvas.width
const height = canvas.height

const totalLanes = 4
let activeLanes = totalLanes
let laneWidth = width / activeLanes

const hitZone = height - 150
const noteTime = 1000

// black box hit area
const keyBoxY = hitZone + 25
const keyBoxHeight = 55
const keyBoxTolerance = 25
const keyBoxCenter = keyBoxY + keyBoxHeight / 2

const maxMiss = 10

const supereasykey = "s"
const supernormalkey = "m"
const easykey = "e"
const normalkey = "n"
const replaykey = "Enter"
const exitkey = "Escape"
const changekey = " "

let laneKeys = ["w","a","s","d"]

let score = 0
let misses = 0
let notes = []
let win = false
let musicStarted = false
let gameOver = false
let exit = false

let transitionAlpha = 1
let transitionSpeed = 0.04

let wait = true
let normal = false
let easy = false
let superEasy = false
let superNormal = false

let choosingKeys = true
let choosingSong = true
let keyInput = []

const laneColor = ["#fca190", "#bff5f0", "#e2f0b4", "#fac296"]

const songs = [
    {name:"Twinkle-twinkle Little Star (小星星)", audio:"twinkle.wav", midi:"twinkle.mid", bg : "Twinklebg.png"},
    {name:"Old MacDonald Had a Farm (王老先生有塊地)", audio:"OldMcDHadAFarm.wav", midi:"OldMcDHadAFarm.mid", bg : "OldMacbg2.png"},
    {name:"Ode to Joy", audio:"odetojoy.wav", midi:"odetojoy.mid", bg : "Odebg2.png"},
    {name:"Tian Mimi (甜蜜蜜)", audio:"tianmimi.wav", midi:"tianmimi.mid", bg : "tianmimibg.png"},
    {name:"We Wish You A Merry Christmas", audio:"WeWishYouAMerryChristmas.wav", midi:"WeWishYouAMerryChristmas2.mid", bg : "WeWishUbg.png"}
]

let currentSong = 0
let music = new Audio(songs[currentSong].audio)

const setupBg = new Image()
setupBg.src = "setupbg.png"

const songBg = []

for(let i = 0; i < songs.length; i++){
    songBg[i] = new Image()
    songBg[i].src = songs[i].bg
}

function drawBg(img, darkAmount = 0.35) {
    if (img && img.complete) {
        ctx.drawImage(img, 0, 0, width, height)
    } else {
        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, width, height)
    }

    ctx.fillStyle = `rgba(0, 0, 0, ${darkAmount})`
    ctx.fillRect(0, 0, width, height)
}

function setBg(imagePath) {
    document.body.style.setProperty("--page-bg", `url("${imagePath}")`)
}

function showKey(k){

    if(k === " ") return "SPACE"
    if(k === "Enter") return "ENTER"
    if(k === "Shift") return "SHIFT"
    if(k === "Tab") return "TAB"
    if(k === "Backspace") return "BACKSPACE"
    if(k === "Escape") return "ESC"
    if(k === "ArrowUp") return "↑"
    if(k === "ArrowDown") return "↓"
    if(k === "ArrowLeft") return "←"
    if(k === "ArrowRight") return "→"

    return k.toUpperCase()
}

function drawBox(){
    for(let i=0;i<activeLanes;i++){
        let x = i * laneWidth

        ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
        ctx.fillRect(x + 20, keyBoxY, laneWidth - 40, keyBoxHeight)

        ctx.strokeStyle = laneColor[i]
        ctx.lineWidth = 3
        ctx.strokeRect(x + 20, keyBoxY, laneWidth - 40, keyBoxHeight)

        ctx.fillStyle = "white"
        ctx.font = "20px DotGothic16"
        ctx.textAlign = "center"
        ctx.fillText(showKey(laneKeys[i]), x + laneWidth / 2, keyBoxY + 36)
    }
}

class Note{

    constructor(lane, hitTime){
        this.lane = lane
        this.hitTime = hitTime
        this.x = lane * laneWidth + laneWidth / 2
    }

    getY(time){
        let spawnTime = this.hitTime - noteTime
        let progress = (time - spawnTime) / noteTime

        // note reaches the black box center when it should be hit
        return progress * keyBoxCenter
    }

    draw(time){

        let y = this.getY(time)

        ctx.beginPath()
        ctx.shadowBlur = 18
        ctx.shadowColor = laneColor[this.lane]
        ctx.arc(this.x, y, 22, 0, Math.PI * 2)
        ctx.fillStyle = laneColor[this.lane]
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.fillStyle = "black"
        ctx.font = "16px DotGothic16"
        ctx.textAlign = "center"

        ctx.fillText(
            showKey(laneKeys[this.lane]),
            this.x,
            y + 6
        )
    }
}

async function loadMidi(){

    notes = []

    const response = await fetch(songs[currentSong].midi)
    const arrayBuffer = await response.arrayBuffer()
    const midi = new Midi(arrayBuffer)

    midi.tracks.forEach(track => {

        if(normal){

            track.notes.forEach(note => {

                let time = note.time * 1000
                let lane = Math.floor(Math.random() * activeLanes)

                notes.push(new Note(lane, time))
            })
        }

        if(easy){

            let lastTime = -999

            track.notes.forEach(note => {
                let time = note.time * 1000

                if(time - lastTime >= 700){
                    let lane = Math.floor(Math.random() * activeLanes)
                    notes.push(new Note(lane, time))
                    lastTime = time
                }
            })
        }

        if(superEasy){

            let lastTime = -999

            track.notes.forEach(note => {
                let time = note.time * 1000

                if(time - lastTime >= 700){
                    let lane = Math.floor(Math.random() * 2)
                    notes.push(new Note(lane, time))
                    lastTime = time
                }
            })
        }

        if(superNormal){

            track.notes.forEach(note => {

                let time = note.time * 1000
                let lane = Math.floor(Math.random() * 2)

                notes.push(new Note(lane, time))
            })
        }

    })
}

async function startGameMode(mode){

    normal = false
    easy = false
    superEasy = false
    superNormal = false

    if(mode === "normal"){
        normal = true
        activeLanes = 4
        laneKeys = keyInput
    }

    if(mode === "easy"){
        easy = true
        activeLanes = 4
        laneKeys = keyInput
    }

    if(mode === "superEasy"){
        superEasy = true
        activeLanes = 2
        laneKeys = keyInput.slice(0, 2)
    }

    if(mode === "superNormal"){
        superNormal = true
        activeLanes = 2
        laneKeys = keyInput.slice(0, 2)
    }

    laneWidth = width / activeLanes

    await loadMidi()

    music.pause()
    music.currentTime = 0
    musicStarted = false

    wait = false
    startTransition()
}

document.addEventListener("keydown", async (e)=>{

    if(choosingKeys){

        if(!keyInput.includes(e.key)){

            keyInput.push(e.key)

            if(keyInput.length === 4){
                laneKeys = keyInput
                choosingKeys = false
                startTransition()
            }
        }

        return
    }

    if(wait){

        if(choosingSong){

            if(e.key >= "1" && e.key <= "5"){
                currentSong = Number(e.key) - 1
                music = new Audio(songs[currentSong].audio)
                choosingSong = false
                startTransition()
            }

            return
        }

        if(e.key === normalkey){
            await startGameMode("normal")
        }

        if(e.key === easykey){
            await startGameMode("easy")
        }

        if(e.key === supereasykey){
            await startGameMode("superEasy")
        }

        if(e.key === supernormalkey){
            await startGameMode("superNormal")
        }

        return
    }

    function resetGame() {

        score = 0
        misses = 0
        notes = []
        win = false
        gameOver = false
        exit = false

        wait = true
        choosingSong = true

        normal = false
        easy = false
        superEasy = false
        superNormal = false

        activeLanes = 4
        laneKeys = keyInput
        laneWidth = width / activeLanes

        music.pause()
        music.currentTime = 0
        musicStarted = false
    }

    if(gameOver || win){

        if(e.key === replaykey){
            resetGame()
            startTransition()
        }

        if(e.key === changekey){
            location.reload()
        }    

        if(e.key === exitkey){

            exit = true

            ctx.clearRect(0,0,width,height)
            ctx.fillStyle = "white"
            ctx.font = "60px DotGothic16"
            ctx.textAlign = "center"
            ctx.fillText("THANKS FOR PLAYING", width/2, height/2)
        }

        return
    }

    let lane = laneKeys.slice(0, activeLanes).indexOf(e.key)

    if(lane == -1) return

    let time = music.currentTime * 1000

    for(let i=0;i<notes.length;i++){

        let n = notes[i]
        let y = n.getY(time)

        let insideBlackBox =
            y >= keyBoxY - keyBoxTolerance &&
            y <= keyBoxY + keyBoxHeight + keyBoxTolerance

        if(n.lane == lane && insideBlackBox){
            score += 10
            notes.splice(i,1)

            // music starts when the player hits the first note
            if(!musicStarted){
                music.play()
                musicStarted = true
            }

            return
        }
    }

})

function drawLanes(){

    for(let i=0;i<activeLanes;i++){

        ctx.fillStyle = "rgba(255, 255, 255, 0.07)"
        ctx.fillRect(i * laneWidth, 0, laneWidth, height)

        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)"
        ctx.lineWidth = 1
        ctx.strokeRect(i * laneWidth, 0, laneWidth, height)

        ctx.strokeStyle = laneColor[i]
        ctx.lineWidth = 3
        ctx.strokeRect(
            i * laneWidth + 8,
            keyBoxY - 12,
            laneWidth - 16,
            keyBoxHeight + 24
        )
    }

    drawBox()
}

function startTransition(){
    transitionAlpha = 1
}

function drawTransition(){
    if(transitionAlpha > 0){
        ctx.fillStyle = `rgba(0, 0, 0, ${transitionAlpha})`
        ctx.fillRect(0, 0, width, height)
        transitionAlpha -= transitionSpeed

        if(transitionAlpha < 0){
            transitionAlpha = 0
        }
    }
}

function beforeGame(){

    ctx.clearRect(0, 0, width, height)

     if(choosingKeys || choosingSong){
        setBg("setupbg.png")
    } else {
        setBg(songs[currentSong].bg)
    }

    ctx.fillStyle = "white"
    ctx.textAlign = "center"

    if(choosingKeys){

        ctx.font = "42px DotGothic16"
        ctx.fillText("INPUT 4 KEYS", width/2, height/2 - 60)

        ctx.font = "28px DotGothic16"

        let preview = ""

        for(let i=0;i<keyInput.length;i++){
            preview += showKey(keyInput[i]) + "   "
        }

        ctx.fillText(preview, width/2, height/2 + 10)

        ctx.font = "20px DotGothic16"
        ctx.fillText("Super Easy and Super Normal will use your first 2 keys only", width/2, height/2 + 55)

        drawTransition()
        return
    }

    if(choosingSong){

        ctx.font = "48px DotGothic16"
        ctx.fillText("CHOOSE SONG", width/2, height/2 - 120)

        ctx.font = "24px DotGothic16"
        ctx.fillText("Press the number of the song that you want to play", width/2, height/2 - 60)

        ctx.font = "23px DotGothic16"
        ctx.fillText("1 = Twinkle-twinkle Little Star (小星星)", width/2, height/2 ) 
        ctx.fillText("2 = Old MacDonald Had a Farm (王老先生有塊地)", width/2, height/2 + 40)
        ctx.fillText("3 = Ode to Joy", width/2, height/2 + 80)
        ctx.fillText("4 = Tian MiMi (甜蜜蜜)", width/2, height/2 + 120)
        ctx.fillText("5 = We Wish You A Merry Christmas", width/2, height/2 + 160)

        drawTransition()
        return
    }

    ctx.font = "48px DotGothic16"
    ctx.fillText("CHOOSE LEVEL", width/2, height/2 - 120)

    ctx.font = "28px DotGothic16"
    ctx.fillText("Song: " + songs[currentSong].name, width/2, height/2 - 50)

    ctx.font = "28px DotGothic16"
    ctx.fillText("Press N = Normal", width/2, height/2 + 10)
    ctx.fillText("Press E = Easy", width/2, height/2 + 60)
    ctx.fillText("Press M = Super Normal (2 Lanes Only!)", width/2, height/2 + 110)
    ctx.fillText("Press S = Super Easy (2 Lanes Only!)", width/2, height/2 + 160)
    

    drawTransition()
}

function game(){

    if(wait){
        beforeGame()
        requestAnimationFrame(game)
        return
    }

    if(exit) return

    ctx.clearRect(0,0,width,height)
    setBg(songs[currentSong].bg)
    drawLanes()

    let musicTime = music.currentTime * 1000

    for(let i=0;i<notes.length;i++){
        let n = notes[i]
        let y = n.getY(musicTime)

        if(y > keyBoxY + keyBoxHeight + 30){
            notes.splice(i,1)
            misses++
            i--
            continue
        }

        n.draw(musicTime)
    }

    document.getElementById("score").innerText = score
    document.getElementById("miss").innerText = misses

    if(misses >= maxMiss && !gameOver){

        gameOver = true
        startTransition()
        music.pause()
        music.currentTime = 0
    }

    if(!gameOver && !win && musicStarted && music.currentTime >= music.duration && misses < maxMiss){
        win = true
        startTransition()
        music.pause()
    }

    if(gameOver){
        
        ctx.filter = "blur(10px)"
        ctx.drawImage(canvas, 0, 0, width, height)
        ctx.filter = "none"

        ctx.fillStyle = "rgba(0,0,0,0.6)"
        ctx.fillRect(0, 0, width, height)

        ctx.fillStyle = "red"
        ctx.font = "bold 72px DotGothic16"
        ctx.textAlign = "center"
        ctx.fillText("GAME OVER", width/2, height/2 - 40)

        ctx.fillStyle = "white"
        ctx.font = "30px DotGothic16"

        ctx.fillText("Press ENTER Replay", width/2, height/2 + 40)
        ctx.fillText("Press SPACE to Change the Key", width/2, height/2 + 80)
        ctx.fillText("Press ESC Exit", width/2, height/2 + 120)

        drawTransition()
        requestAnimationFrame(game)
        return
    }

    if(win){

        ctx.filter = "blur(10px)"
        ctx.drawImage(canvas, 0, 0, width, height)
        ctx.filter = "none"

        ctx.fillStyle = "rgba(0,0,0,0.6)"
        ctx.fillRect(0, 0, width, height)

        ctx.fillStyle = "#0de002"
        ctx.font = "bold 72px DotGothic16"
        ctx.textAlign = "center"
        ctx.fillText("YOU WIN", width/2, height/2 - 40)

        ctx.fillStyle = "white"
        ctx.font = "30px DotGothic16"

        ctx.fillText("Press ENTER Replay", width/2, height/2 + 40)
        ctx.fillText("Press SPACE to Change the Key", width/2, height/2 + 80)
        ctx.fillText("Press ESC Exit", width/2, height/2 + 120)

        drawTransition()
        requestAnimationFrame(game)
        return
    }

    requestAnimationFrame(game)
}

requestAnimationFrame(game)
