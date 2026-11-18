const icons = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  logout: '<path d="M10 17v3H4V4h6v3M14 8l4 4-4 4M8 12h10"/>',
  comment: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l1.2-3A8.5 8.5 0 1 1 21 11.5Z"/>',
  heart: '<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 3v7m4-7v7"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m4 18 5-5 3 3 3-4 5 6"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0M9 9h.01M15 9h.01"/>',
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
        <section class="sns-composer" aria-label="새 글 작성"><div class="sns-avatar self">${initial(user.name)}</div><form id="post-form"><label class="sr-only" for="post-content">새 글 내용</label><textarea id="post-content" placeholder="무슨 일이 일어나고 있나요?" maxlength="500" rows="1"></textarea><div id="image-preview" class="sns-image-preview" hidden><img alt="선택한 이미지 미리보기"><button type="button" id="remove-image" aria-label="이미지 제거">×</button></div><p id="compose-status" class="sns-compose-status" role="status" aria-live="polite"></p><div class="sns-compose-footer"><div class="sns-attachment"><input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" hidden><button type="button" id="attach-image" class="sns-attach" aria-label="이미지 첨부 (한국 시간 하루 5장)" title="이미지 추가">${icon('image')}</button><div class="sns-emoji-wrap"><button type="button" id="emoji-toggle" class="sns-attach" aria-label="이모지 선택" aria-expanded="false" aria-controls="emoji-picker" title="이모지 추가">${icon('smile')}</button><div id="emoji-picker" class="sns-emoji-picker" role="group" aria-label="이모지" hidden>${['😀','😊','😂','🥰','😍','🥹','😎','🤔','😢','😮','👏','👍','🙌','🙏','❤️','💙','✨','🔥','🎉','🌸','☀️','🌈','☕','🍀'].map(emoji => `<button type="button" data-emoji="${emoji}" aria-label="${emoji}">${emoji}</button>`).join('')}</div></div><span class="sns-compose-hint">하루 5장 · 장당 2MB</span></div><div class="sns-compose-actions"><span id="post-count" class="sns-char-counter" role="status" aria-label="500자 남음"><svg viewBox="0 0 24 24" aria-hidden="true"><circle class="sns-counter-track" cx="12" cy="12" r="9"/><circle id="post-progress" class="sns-counter-progress" cx="12" cy="12" r="9" pathLength="100"/></svg><span id="post-remaining"></span></span><button type="submit" class="sns-submit" disabled>게시하기</button></div></div></form></section>
        <dialog id="compose-dialog" class="sns-compose-dialog" aria-label="새 글 작성"><div class="sns-dialog-header"><button type="button" id="close-compose" aria-label="작성창 닫기">×</button><span>새 게시글</span></div><div id="dialog-composer"></div></dialog>
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
  const composeStatus = root.querySelector('#compose-status')
  const composer = root.querySelector('.sns-composer')
  const composerParent = composer.parentElement
  const dialog = root.querySelector('#compose-dialog')
  const submitButton = root.querySelector('#post-form button[type="submit"]')
  const emojiToggle = root.querySelector('#emoji-toggle')
  const emojiPicker = root.querySelector('#emoji-picker')
  let previewURL = null
  let selectedImage = null
  let submitting = false
  let dialogTrigger = null
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
  function openComposer(event) {
    dialogTrigger = event.currentTarget
    root.querySelector('#dialog-composer').append(composer)
    dialog.showModal()
    textarea.focus()
  }
  for (const id of ['focus-compose', 'mobile-write']) root.querySelector(`#${id}`).addEventListener('click', openComposer)
  root.querySelector('#close-compose').addEventListener('click', () => { if (!submitting) dialog.close() })
  dialog.addEventListener('cancel', event => { if (submitting) event.preventDefault() })
  dialog.addEventListener('click', event => { if (event.target === dialog && !submitting) dialog.close() })
  dialog.addEventListener('close', () => { closeEmojiPicker(); composerParent.insertBefore(composer, dialog); dialogTrigger?.focus() })
  function updateComposer() {
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`
    const remaining = 500 - textarea.value.length
    const counter = root.querySelector('#post-count')
    counter.setAttribute('aria-label', `${remaining}자 남음`)
    counter.classList.toggle('near-limit', remaining <= 50)
    root.querySelector('#post-remaining').textContent = remaining <= 50 ? remaining : ''
    root.querySelector('#post-progress').style.strokeDasharray = `${textarea.value.length / 5} 100`
    submitButton.disabled = submitting || (!textarea.value.trim() && !selectedImage)
  }
  function clearImage() {
    if (previewURL) URL.revokeObjectURL(previewURL)
    previewURL = null
    selectedImage = null
    imageInput.value = ''
    imagePreview.hidden = true
    imagePreview.querySelector('img').removeAttribute('src')
    updateComposer()
  }
  function closeEmojiPicker() {
    emojiPicker.hidden = true
    emojiToggle.setAttribute('aria-expanded', 'false')
  }
  emojiToggle.addEventListener('click', () => {
    emojiPicker.hidden = !emojiPicker.hidden
    emojiToggle.setAttribute('aria-expanded', String(!emojiPicker.hidden))
  })
  emojiPicker.addEventListener('click', event => {
    const button = event.target.closest('button[data-emoji]')
    if (!button) return
    const emoji = button.dataset.emoji
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (textarea.value.length - (end - start) + emoji.length > 500) {
      composeStatus.textContent = '글은 500자까지 입력할 수 있습니다.'
      return
    }
    textarea.setRangeText(emoji, start, end, 'end')
    closeEmojiPicker()
    textarea.focus()
    composeStatus.textContent = ''
    updateComposer()
  })
  composer.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !emojiPicker.hidden) {
      event.preventDefault()
      event.stopPropagation()
      closeEmojiPicker()
      emojiToggle.focus()
    }
  })
  composer.addEventListener('click', event => { if (!event.target.closest('.sns-emoji-wrap')) closeEmojiPicker() })
  root.querySelector('#attach-image').addEventListener('click', () => imageInput.click())
  root.querySelector('#remove-image').addEventListener('click', () => { clearImage(); composeStatus.textContent = '' })
  function selectImage(file) {
    if (!file) { clearImage(); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      clearImage()
      composeStatus.textContent = 'JPEG, PNG 또는 WebP 이미지를 2MB 이하로 선택해 주세요.'
      return
    }
    if (previewURL) URL.revokeObjectURL(previewURL)
    selectedImage = file
    previewURL = URL.createObjectURL(file)
    imagePreview.querySelector('img').src = previewURL
    imagePreview.hidden = false
    composeStatus.textContent = ''
    updateComposer()
  }
  imageInput.addEventListener('change', () => selectImage(imageInput.files[0]))
  textarea.addEventListener('paste', event => {
    const file = Array.from(event.clipboardData?.items || []).find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
    if (file) { event.preventDefault(); selectImage(file) }
  })
  composer.addEventListener('dragover', event => { if (Array.from(event.dataTransfer?.types || []).includes('Files')) { event.preventDefault(); composer.classList.add('is-dragging') } })
  composer.addEventListener('dragleave', event => { if (!composer.contains(event.relatedTarget)) composer.classList.remove('is-dragging') })
  composer.addEventListener('drop', event => {
    if (!event.dataTransfer?.files.length) return
    event.preventDefault(); composer.classList.remove('is-dragging'); selectImage(event.dataTransfer.files[0])
  })
  textarea.addEventListener('input', () => { composeStatus.textContent = ''; updateComposer() })
  textarea.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !submitButton.disabled) {
      event.preventDefault()
      root.querySelector('#post-form').requestSubmit()
    }
  })
  root.querySelector('#post-form').addEventListener('submit', async event => {
    event.preventDefault()
    if (submitting) return
    const content = textarea.value.trim()
    const file = selectedImage
    if (!content && !file) { composeStatus.textContent = '내용이나 이미지를 입력해 주세요.'; return }
    submitting = true
    textarea.disabled = true
    root.querySelector('#attach-image').disabled = true
    root.querySelector('#remove-image').disabled = true
    root.querySelector('#close-compose').disabled = true
    composeStatus.textContent = ''
    updateComposer()
    try {
      if (file) {
        const body = new FormData()
        body.append('content', content)
        body.append('image', file)
        await request('/api/posts/with-image', { method: 'POST', body })
      } else {
        await request('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
      }
      textarea.value = ''; clearImage(); openPost = null
      if (dialog.open) dialog.close()
      await loadFeed()
    } catch (error) { if (composeStatus.isConnected) composeStatus.textContent = error.message }
    finally {
      submitting = false
      textarea.disabled = false
      root.querySelector('#attach-image')?.removeAttribute('disabled')
      root.querySelector('#remove-image')?.removeAttribute('disabled')
      root.querySelector('#close-compose')?.removeAttribute('disabled')
      if (textarea.isConnected) updateComposer()
    }
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
  updateComposer()
  loadFeed()
}
