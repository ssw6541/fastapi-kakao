export function restoreSession({ onAuthenticated, onUnauthenticated }) {
  const overlay = document.createElement('div')
  overlay.className = 'session-overlay'
  overlay.setAttribute('role', 'status')
  overlay.setAttribute('aria-live', 'polite')
  document.body.append(overlay)

  async function checkSession() {
    overlay.innerHTML = '<div class="session-panel"><span class="session-mark" aria-hidden="true">✳</span><p>로그인 상태를 확인하고 있어요</p><small>잠시만 기다려 주세요.</small></div>'
    try {
      const response = await fetch('/api/me', { cache: 'no-store' })
      if (response.status === 401) {
        onUnauthenticated()
      } else {
        if (!response.ok) throw new Error('Session check failed')
        onAuthenticated(await response.json())
      }
      overlay.remove()
    } catch {
      overlay.innerHTML = '<div class="session-panel"><span class="session-mark" aria-hidden="true">✳</span><p>연결을 확인할 수 없어요</p><small>서버 연결을 확인한 뒤 다시 시도해 주세요.</small><button type="button" class="session-retry">다시 시도</button></div>'
      overlay.querySelector('.session-retry').addEventListener('click', checkSession)
    }
  }

  checkSession()
}
