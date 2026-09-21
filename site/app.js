const FINISH_MS = 460
const TOMB_HEIGHT = '2.75rem'
const BANISH_CLASSES = ['is-banish', 'is-fall', 'is-severe', 'is-hidden']

const post = document.querySelector('[data-demo-post]')
const replayButton = document.querySelector('[data-demo-replay]')
const showButton = document.querySelector('[data-demo-show]')
const liveRegion = document.querySelector('[data-demo-live]')

let timer = 0

function reducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function announce(message) {
  liveRegion.textContent = ''
  requestAnimationFrame(() => {
    liveRegion.textContent = message
  })
}

function resetPost() {
  clearTimeout(timer)
  post.classList.remove(...BANISH_CLASSES)
  post.style.height = ''
}

function finishCollapse() {
  post.classList.remove('is-banish', 'is-fall', 'is-severe')
  post.style.height = ''
  post.classList.add('is-hidden')
}

function collapse() {
  if (reducedMotion()) {
    post.classList.add('is-hidden')
    return
  }
  post.style.height = `${post.getBoundingClientRect().height}px`
  post.classList.add('is-banish', 'is-severe')
  requestAnimationFrame(() => {
    post.classList.add('is-fall')
    post.style.height = TOMB_HEIGHT
    timer = setTimeout(finishCollapse, FINISH_MS)
  })
}

function onReplay() {
  resetPost()
  announce('Post hidden. Slop score 8.4 of 10.')
  requestAnimationFrame(() => requestAnimationFrame(collapse))
}

function onShow() {
  resetPost()
  announce('Post restored.')
  replayButton.focus()
}

replayButton.addEventListener('click', onReplay)
showButton.addEventListener('click', onShow)
