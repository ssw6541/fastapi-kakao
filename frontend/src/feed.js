const icons = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  logout: '<path d="M10 17v3H4V4h6v3M14 8l4 4-4 4M8 12h10"/>',
  comment: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l1.2-3A8.5 8.5 0 1 1 21 11.5Z"/>',
  heart: '<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 3v7m4-7v7"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m4 18 5-5 3 3 3-4 5 6"/>',
}

const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const initial = name => escapeHTML(Array.from(name.trim())[0] || '?')
const timeLabel = value => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}일 전`
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date)
}

export function showTimeline(root, user, { onProfile, onLogout, onExpired }) {
  document.body.classList.add('in-app')
  root.innerHTML = `
    <div class="sns">
      <aside class="sns-sidebar">
        <a class="sns-logo" href="/" aria-label="모아 홈"><span class="sns-logo-mark">✳</span><span>moa<span class="logo-dot">.</span></span></a>
        <div class="sns-side-label">YOUR SPACE</div>
        <nav class="sns-nav" aria-label="메인 메뉴">
          <button class="sns-nav-item active" id="feed-home">${icon('home')}<span>홈</span><i></i></button>
          <button class="sns-nav-item" id="profile">${icon('user')}<span>내 정보</span></button>
        </nav>
        <button class="sns-write-button" id="focus-compose">글쓰기 <span>↗</span></button>
        <div class="sns-sidebar-bottom"><div class="sns-account"><div class="sns-avatar self">${initial(user.name)}</div><div class="sns-account-text"><strong></strong><small>내 계정</small></div><button class="sns-logout" id="feed-logout" aria-label="로그아웃" title="로그아웃">${icon('logout')}</button></div></div>
      </aside>
      <main class="sns-main">
        <header class="sns-header"><div><div class="sns-eyebrow">YOUR COMMUNITY</div><h1>홈 <span>✳</span></h1></div><button id="refresh-feed" class="sns-icon-button" title="새로고침" aria-label="새로고침">↻</button></header>
        <div class="sns-tabs"><span>전체 피드</span><small>모두의 이야기를 만나보세요</small></div>
        <section class="sns-composer" aria-label="새 글 작성"><div class="sns-avatar self">${initial(user.name)}</div><form id="post-form"><label class="sr-only" for="post-content">새 글 내용</label><textarea id="post-content" placeholder="지금 어떤 생각을 하고 있나요?" maxlength="500" rows="2"></textarea><div id="image-preview" class="sns-image-preview" hidden><img alt="선택한 이미지 미리보기"><button type="button" id="remove-image" aria-label="이미지 제거">×</button></div><div class="sns-compose-footer"><div class="sns-attachment"><input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" hidden><button type="button" id="attach-image" class="sns-attach" aria-label="이미지 첨부 (한국 시간 하루 5장)">${icon('image')}</button><span class="sns-compose-hint">하루 5장 · 장당 2MB</span></div><div><span id="post-count">0 / 500</span><button type="submit" class="sns-submit">게시하기 ${icon('arrow')}</button></div></div></form></section>
        <div class="sns-section-heading"><span>새로운 이야기</span><span>NEWEST FIRST</span></div>
        <div id="feed-status" class="sns-status" role="status" aria-live="polite"></div><div id="feed-list"></div>
      </main>
      <aside class="sns-right"><div class="sns-right-top"><span class="sns-spark">✳</span> 작은 이야기들이 모이는 곳</div><div class="sns-welcome"><span class="sns-welcome-label">HELLO, THERE!</span><h2>당신의 하루가<br>궁금해요<span>.</span></h2><p>생각과 일상을 자유롭게 나누고,<br>서로의 이야기에 반응해 보세요.</p><div class="sns-welcome-art"><span>✳</span><span>✦</span><span>●</span></div></div><div class="sns-guide"><span class="sns-guide-kicker">COMMUNITY NOTES</span><h3>함께 만드는 공간 <span>↗</span></h3><div><b>01</b><p>반가운 인사부터 시작해요<small>가벼운 일상도 좋은 이야기가 돼요.</small></p></div><div><b>02</b><p>서로를 존중해요<small>다른 생각에도 따뜻한 마음으로.</small></p></div><div><b>03</b><p>마음을 표현해요<small>좋아요와 답글로 이야기를 이어가요.</small></p></div></div><p class="sns-copyright">© MOA COMMUNITY <span>·</span> 함께라서 더 좋은 이야기</p></aside>
      <nav class="sns-mobile-nav" aria-label="모바일 메뉴"><button id="mobile-home">${icon('home')}<span>홈</span></button><button id="mobile-write">✎<span>글쓰기</span></button><button id="mobile-profile">${icon('user')}<span>내 정보</span></button><button id="mobile-logout">${icon('logout')}<span>로그아웃</span></button></nav>
    </div>`
  root.querySelector('.sns-account-text strong').textContent = user.name
  const list = root.querySelector('#feed-list')
  const status = root.querySelector('#feed-status')
  const textarea = root.querySelector('#post-content')
  const imageInput = root.querySelector('#image-input')
  const imagePreview = root.querySelector('#image-preview')
  let previewURL = null
  let openPost = null
  let loading = false

  async function request(url, options = {}) {
    const response = await fetch(url, options)
    if (response.status === 401) { onExpired(); throw new Error('로그인이 만료되었습니다.') }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(typeof data.detail === 'string' ? data.detail : '요청을 처리하지 못했습니다.')
    }
    return response.status === 204 ? null : response.json()
  }

  function card(post, reply = false) {
    return `<article class="sns-post ${reply ? 'sns-reply' : ''}" data-post-id="${post.id}">
      <div class="sns-avatar ${post.author_id === user.id ? 'self' : 'other'}">${initial(post.author)}</div>
      <div class="sns-post-body"><div class="sns-post-top"><div><strong>${escapeHTML(post.author)}</strong><span class="sns-post-meta"> · ${timeLabel(post.created_at)}</span></div>${post.author_id === user.id ? `<button class="sns-delete" data-action="delete" data-id="${post.id}" aria-label="게시글 삭제" title="삭제">${icon('trash')}</button>` : ''}</div>
      ${post.content ? `<p class="sns-post-content">${escapeHTML(post.content)}</p>` : ''}
      ${post.has_image ? `<img class="sns-post-image" src="/api/posts/${post.id}/image" alt="${escapeHTML(post.author)}님의 첨부 이미지" loading="lazy">` : ''}
      <div class="sns-post-actions">${reply ? '' : `<button data-action="replies" data-id="${post.id}" aria-expanded="${openPost === post.id}">${icon('comment')}<span>${post.reply_count}</span></button>`}<button data-action="like" data-id="${post.id}" class="${post.liked ? 'liked' : ''}" aria-label="${post.liked ? '좋아요 취소' : '좋아요'}" aria-pressed="${post.liked}">${icon('heart')}<span>${post.like_count}</span></button></div>
      ${!reply && openPost === post.id ? `<div class="sns-replies" id="replies-${post.id}"><div class="sns-replies-loading">답글을 불러오는 중...</div></div><form class="sns-reply-form" data-id="${post.id}"><label class="sr-only" for="reply-input-${post.id}">답글 내용</label><input id="reply-input-${post.id}" name="content" placeholder="답글을 남겨보세요" maxlength="500" required><button type="submit">답글</button></form>` : ''}</div></article>`
  }

  async function loadReplies(id) {
    const target = root.querySelector(`#replies-${id}`)
    if (!target) return
    try {
      const replies = await request(`/api/posts/${id}/replies`)
      if (!target.isConnected) return
      target.innerHTML = replies.length ? replies.map(post => card(post, true)).join('') : '<p class="sns-no-replies">첫 번째 답글을 남겨보세요.</p>'
    } catch (error) { if (target.isConnected) target.textContent = error.message }
  }

  async function loadFeed() {
    if (loading) return
    loading = true
    status.textContent = '이야기를 불러오는 중...'
    try {
      const posts = await request('/api/posts')
      if (!root.querySelector('#feed-list')) return
      status.textContent = ''
      list.innerHTML = posts.length ? posts.map(post => card(post)).join('') : '<div class="sns-empty"><div>✳</div><h2>아직 이야기가 없어요</h2><p>첫 번째 글로 이 공간을 채워주세요.</p></div>'
      if (openPost && posts.some(post => post.id === openPost)) await loadReplies(openPost)
    } catch (error) { if (status.isConnected) status.textContent = error.message }
    finally { loading = false }
  }

  root.querySelector('#profile').addEventListener('click', onProfile)
  root.querySelector('#mobile-profile').addEventListener('click', () => root.querySelector('#profile').click())
  root.querySelector('#feed-logout').addEventListener('click', onLogout)
  root.querySelector('#mobile-logout').addEventListener('click', () => root.querySelector('#feed-logout').click())
  root.querySelector('#feed-home').addEventListener('click', () => { openPost = null; loadFeed(); window.scrollTo({ top: 0, behavior: 'smooth' }) })
  root.querySelector('#mobile-home').addEventListener('click', () => root.querySelector('#feed-home').click())
  root.querySelector('#refresh-feed').addEventListener('click', loadFeed)
  for (const id of ['focus-compose', 'mobile-write']) root.querySelector(`#${id}`).addEventListener('click', () => { textarea.focus(); textarea.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
  function clearImage() {
    if (previewURL) URL.revokeObjectURL(previewURL)
    previewURL = null
    imageInput.value = ''
    imagePreview.hidden = true
    imagePreview.querySelector('img').removeAttribute('src')
  }
  root.querySelector('#attach-image').addEventListener('click', () => imageInput.click())
  root.querySelector('#remove-image').addEventListener('click', clearImage)
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0]
    if (!file) { clearImage(); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      clearImage()
      status.textContent = 'JPEG, PNG 또는 WebP 이미지를 2MB 이하로 선택해 주세요.'
      return
    }
    if (previewURL) URL.revokeObjectURL(previewURL)
    previewURL = URL.createObjectURL(file)
    imagePreview.querySelector('img').src = previewURL
    imagePreview.hidden = false
    status.textContent = ''
  })
  textarea.addEventListener('input', () => { root.querySelector('#post-count').textContent = `${textarea.value.length} / 500` })
  root.querySelector('#post-form').addEventListener('submit', async event => {
    event.preventDefault()
    const content = textarea.value.trim()
    const file = imageInput.files[0]
    if (!content && !file) { status.textContent = '내용이나 이미지를 입력해 주세요.'; return }
    const button = event.currentTarget.querySelector('button'); button.disabled = true
    try {
      if (file) {
        const body = new FormData()
        body.append('content', content)
        body.append('image', file)
        await request('/api/posts/with-image', { method: 'POST', body })
      } else {
        await request('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
      }
      textarea.value = ''; clearImage(); root.querySelector('#post-count').textContent = '0 / 500'; openPost = null; await loadFeed()
    } catch (error) { if (status.isConnected) status.textContent = error.message }
    finally { button.disabled = false }
  })
  list.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]')
    if (!button) return
    const id = Number(button.dataset.id)
    if (button.dataset.action === 'replies') { openPost = openPost === id ? null : id; await loadFeed(); return }
    if (button.dataset.action === 'delete' && !window.confirm('이 글을 삭제하시겠습니까?')) return
    button.disabled = true
    try {
      await request(`/api/posts/${id}${button.dataset.action === 'like' ? '/like' : ''}`, { method: button.dataset.action === 'like' ? 'POST' : 'DELETE' })
      if (button.dataset.action === 'delete' && openPost === id) openPost = null
      await loadFeed()
    } catch (error) { if (status.isConnected) status.textContent = error.message }
    finally { button.disabled = false }
  })
  list.addEventListener('submit', async event => {
    if (!event.target.matches('.sns-reply-form')) return
    event.preventDefault()
    const form = event.target; const content = form.elements.content.value.trim(); const button = form.querySelector('button')
    if (!content) { status.textContent = '답글을 입력해 주세요.'; return }
    button.disabled = true
    try {
      await request('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, parent_id: Number(form.dataset.id) }) })
      await loadFeed()
    } catch (error) { if (status.isConnected) status.textContent = error.message }
    finally { button.disabled = false }
  })
  loadFeed()
}
