import './style.css'
import googleIcon from './assets/google.png'
import kakaoIcon from './assets/kakao.png'

document.querySelector('#app').innerHTML = `
  <main class="layout">
    <section class="intro" aria-label="서비스 소개">
      <div class="brand"><span class="brand-mark">✳</span> 새로운 시작</div>
      <div class="intro-content">
        <span class="eyebrow">WELCOME ABOARD</span>
        <h1>반가워요.<br>우리 함께 시작해요<span>.</span></h1>
        <p>간단한 정보만 입력하고<br>새로운 여정을 시작해 보세요.</p>
      </div>
      <div class="intro-footer">작은 시작이 특별한 경험으로 이어집니다.</div>
      <div class="decoration decoration-one"></div><div class="decoration decoration-two"></div>
    </section>
    <section class="form-section">
      <div class="form-wrap">
        <div class="mobile-brand"><span class="brand-mark">✳</span> 새로운 시작</div>
        <div id="content"></div>
      </div>
    </section>
  </main>`

const content = document.querySelector('#content')

function showForm(mode, notice = '') {
  const isSignup = mode === 'signup'
  content.innerHTML = `
    <div class="form-heading"><span class="step">${isSignup ? 'GET STARTED' : 'WELCOME BACK'}</span>
      <h2>${isSignup ? '회원가입' : '로그인'}</h2>
      <p>${isSignup ? '서비스 이용을 위해 계정을 만들어 주세요.' : '다시 만나서 반가워요. 계정으로 로그인해 주세요.'}</p>
    </div>
    <form id="auth-form">
      ${isSignup ? '<label for="name">이름</label><input id="name" name="name" autocomplete="name" placeholder="이름을 입력해 주세요" required maxlength="50" />' : ''}
      <label for="email">이메일</label>
      <input id="email" name="email" type="email" autocomplete="email" placeholder="example@email.com" required maxlength="254" />
      <label for="password">비밀번호</label>
      <input id="password" name="password" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="비밀번호를 입력해 주세요" required ${isSignup ? 'minlength="8"' : ''} maxlength="128" />
      ${isSignup ? '<p class="hint">비밀번호는 8자 이상 입력해 주세요.</p><label for="confirm">비밀번호 확인</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" placeholder="비밀번호를 다시 입력해 주세요" required minlength="8" maxlength="128" />' : ''}
      <p id="message" class="message" role="status" aria-live="polite"></p>
      <button type="submit">${isSignup ? '계정 만들기' : '로그인'} <span aria-hidden="true">→</span></button>
    </form>
    ${isSignup ? '' : `<div class="login-divider"><span>또는</span></div><a class="kakao-button" href="/api/auth/kakao"><img src="${kakaoIcon}" alt="">카카오로 로그인</a><a class="google-button" href="/api/auth/google"><img src="${googleIcon}" alt="">Google로 로그인</a>`}
    <p class="footnote">${isSignup ? '이미 계정이 있으신가요?' : '아직 계정이 없으신가요?'} <button class="text-button" id="switch-form" type="button">${isSignup ? '로그인' : '회원가입'}</button></p>`
  const form = document.querySelector('#auth-form')
  const message = document.querySelector('#message')
  if (notice) { message.classList.add('success'); message.textContent = notice }
  document.querySelector('#switch-form').addEventListener('click', () => showForm(isSignup ? 'login' : 'signup'))
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    message.textContent = ''
    message.className = 'message'
    const data = new FormData(form)
    if (isSignup && data.get('password') !== data.get('confirm')) {
      message.textContent = '비밀번호가 일치하지 않습니다.'
      return
    }
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    try {
      const payload = { email: data.get('email'), password: data.get('password') }
      if (isSignup) payload.name = data.get('name')
      const response = await fetch(`/api/${isSignup ? 'signup' : 'login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : '입력 내용을 확인해 주세요.')
      if (isSignup) showForm('login', '가입이 완료되었습니다. 로그인해 주세요.')
      else showAccount(result)
    } catch (error) {
      message.textContent = error instanceof TypeError ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' : error.message
    } finally {
      button.disabled = false
    }
  })
}

function showAccount(user) {
  content.innerHTML = `<div class="form-heading"><span class="step">WELCOME BACK</span><h2 id="welcome"></h2><p>로그인되어 있습니다.</p></div><p id="account-email" class="account-email"></p><button type="button" id="profile" class="full-button">내 정보 확인</button><p id="account-message" class="message" role="status" aria-live="polite"></p><button type="button" id="logout" class="full-button">로그아웃</button>`
  document.querySelector('#welcome').textContent = `${user.name}님, 반가워요.`
  document.querySelector('#account-email').textContent = user.email || '소셜 계정으로 로그인'
  document.querySelector('#profile').addEventListener('click', showProfile)
  document.querySelector('#logout').addEventListener('click', async (event) => {
    event.currentTarget.disabled = true
    try {
      const response = await fetch('/api/logout', { method: 'POST' })
      if (!response.ok) throw new Error('로그아웃에 실패했습니다.')
      showForm('login', '로그아웃되었습니다.')
    } catch {
      document.querySelector('#account-message').textContent = '로그아웃할 수 없습니다. 다시 시도해 주세요.'
      event.currentTarget.disabled = false
    }
  })
}


async function showProfile() {
  const button = document.querySelector('#profile')
  button.disabled = true
  try {
    const response = await fetch('/api/me', { cache: 'no-store' })
    if (response.status === 401) {
      showForm('login', '로그인이 만료되었습니다. 다시 로그인해 주세요.')
      return
    }
    if (!response.ok) throw new Error('정보를 불러오지 못했습니다.')
    const user = await response.json()
    content.innerHTML = `
      <div class="form-heading"><span class="step">MY ACCOUNT</span><h2>내 정보</h2><p>가입하신 계정 정보를 확인하세요.</p></div>
      <dl class="profile-details">
        <div><dt>이름</dt><dd id="profile-name"></dd></div>
        <div><dt>이메일</dt><dd id="profile-email"></dd></div>
      </dl>
      <p id="profile-message" class="message" role="status" aria-live="polite"></p>
      <button type="button" id="back-to-account" class="full-button">돌아가기</button>
      <button type="button" id="delete-account" class="delete-button">회원탈퇴</button>`
    document.querySelector('#profile-name').textContent = user.name
    document.querySelector('#profile-email').textContent = user.email || '이메일 정보 없음'
    document.querySelector('#back-to-account').addEventListener('click', () => showAccount(user))
    document.querySelector('#delete-account').addEventListener('click', async (event) => {
      if (!window.confirm('회원탈퇴를 진행하시겠습니까? 계정 정보가 삭제되며 되돌릴 수 없습니다.')) return
      const deleteButton = event.currentTarget
      const backButton = document.querySelector('#back-to-account')
      deleteButton.disabled = true
      backButton.disabled = true
      try {
        const result = await fetch('/api/me', { method: 'DELETE' })
        if (result.status === 401) {
          showForm('login', '로그인이 만료되었습니다. 다시 로그인해 주세요.')
        } else if (!result.ok) {
          throw new Error('탈퇴 실패')
        } else {
          showForm('login', '회원탈퇴가 완료되었습니다.')
        }
      } catch {
        document.querySelector('#profile-message').textContent = '회원탈퇴를 처리하지 못했습니다. 다시 시도해 주세요.'
        deleteButton.disabled = false
        backButton.disabled = false
      }
    })
  } catch {
    document.querySelector('#account-message').textContent = '정보를 불러오지 못했습니다. 다시 시도해 주세요.'
    button.disabled = false
  }
}

showForm('login')
fetch('/api/me').then(response => response.ok ? response.json() : null).then(user => { if (user) showAccount(user) }).catch(() => {})
