var tipButtons = document.querySelectorAll('.tip-button')

function coinAudio() {
    var coinAudio = document.getElementById("coinAudio");
    if (coinAudio) {
        coinAudio.play();//有音频时播放
    }
}
// Loop through all buttons (allows for multiple buttons on page)
tipButtons.forEach((button) => {
    var coin = button.querySelector('.coin')

    // The larger the number, the slower the animation
    coin.maxMoveLoopCount = 90

    button.addEventListener('click', () => {
        if (/Android|webOS|BlackBerry/i.test(navigator.userAgent)) return true; //媒体选择
        if (button.clicked) return
        button.classList.add('clicked')

        // Wait to start flipping th coin because of the button tilt animation
        setTimeout(() => {
            // Randomize the flipping speeds just for fun
            coin.sideRotationCount = Math.floor(Math.random() * 5) * 90
            coin.maxFlipAngle = (Math.floor(Math.random() * 4) + 3) * Math.PI
            button.clicked = true
            flipCoin()
            coinAudio()
        }, 50)
    })

    var flipCoin = () => {
        coin.moveLoopCount = 0
        flipCoinLoop()
    }

    var resetCoin = () => {
        coin.style.setProperty('--coin-x-multiplier', 0)
        coin.style.setProperty('--coin-scale-multiplier', 0)
        coin.style.setProperty('--coin-rotation-multiplier', 0)
        coin.style.setProperty('--shine-opacity-multiplier', 0.4)
        coin.style.setProperty('--shine-bg-multiplier', '50%')
        coin.style.setProperty('opacity', 1)
        // Delay to give the reset animation some time before you can click again
        setTimeout(() => {
            button.clicked = false
        }, 300)
    }

    var flipCoinLoop = () => {
        coin.moveLoopCount++
        var percentageCompleted = coin.moveLoopCount / coin.maxMoveLoopCount
        coin.angle = -coin.maxFlipAngle * Math.pow((percentageCompleted - 1), 2) + coin.maxFlipAngle

        // Calculate the scale and position of the coin moving through the air
        coin.style.setProperty('--coin-y-multiplier', -11 * Math.pow(percentageCompleted * 2 - 1, 4) + 11)
        coin.style.setProperty('--coin-x-multiplier', percentageCompleted)
        coin.style.setProperty('--coin-scale-multiplier', percentageCompleted * 0.6)
        coin.style.setProperty('--coin-rotation-multiplier', percentageCompleted * coin.sideRotationCount)

        // Calculate the scale and position values for the different coin faces
        // The math uses sin/cos wave functions to similate the circular motion of 3D spin
        coin.style.setProperty('--front-scale-multiplier', Math.max(Math.cos(coin.angle), 0))
        coin.style.setProperty('--front-y-multiplier', Math.sin(coin.angle))

        coin.style.setProperty('--middle-scale-multiplier', Math.abs(Math.cos(coin.angle), 0))
        coin.style.setProperty('--middle-y-multiplier', Math.cos((coin.angle + Math.PI / 2) % Math.PI))

        coin.style.setProperty('--back-scale-multiplier', Math.max(Math.cos(coin.angle - Math.PI), 0))
        coin.style.setProperty('--back-y-multiplier', Math.sin(coin.angle - Math.PI))

        coin.style.setProperty('--shine-opacity-multiplier', 4 * Math.sin((coin.angle + Math.PI / 2) % Math.PI) - 3.2)
        coin.style.setProperty('--shine-bg-multiplier', -40 * (Math.cos((coin.angle + Math.PI / 2) % Math.PI) - 0.5) + '%')

        // Repeat animation loop
        if (coin.moveLoopCount < coin.maxMoveLoopCount) {
            if (coin.moveLoopCount === coin.maxMoveLoopCount - 6) button.classList.add('shrink-landing')
            window.requestAnimationFrame(flipCoinLoop)
        } else {
            button.classList.add('coin-landed')
            coin.style.setProperty('opacity', 0)
            setTimeout(() => {
                button.classList.remove('clicked', 'shrink-landing', 'coin-landed')
                setTimeout(() => {
                    resetCoin()
                }, 300)
            }, 1500)
        }
    }
})