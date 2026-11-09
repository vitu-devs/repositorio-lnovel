// Unmodified TTS section from LNReader v2.1.4 assets/reader/js/core.js.
// https://github.com/LNReader/lnreader/blob/v2.1.4/assets/reader/js/core.js
// MIT license: see LNREADER-LICENSE.
window.tts = new (function () {
  this.readableNodeNames = [
    '#text',
    'B',
    'I',
    'SPAN',
    'EM',
    'BR',
    'STRONG',
    'A',
    'MARK',
  ];
  this.prevElement = null;
  this.currentElement = reader.chapterElement;
  this.started = false;
  this.reading = false;
  this.elementsRead = 0;
  this.totalElements = 0;
  this.allReadableElements = []; // Store all readable elements at start
  this.textQueue = []; // Flat list of normalized text for native fallback

  this.readable = element => {
    const ele = element ?? this.currentElement;
    if (
      ele.nodeName !== 'SPAN' &&
      this.readableNodeNames.includes(ele.nodeName)
    ) {
      return false;
    }
    if (!ele.hasChildNodes()) {
      return false;
    }
    for (let i = 0; i < ele.childNodes.length; i++) {
      if (!this.readableNodeNames.includes(ele.childNodes.item(i).nodeName)) {
        return false;
      }
    }
    return true;
  };

  this.normalizeText = text => {
    if (!text) return '';
    const normalized = text
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
      .replace(/\s*([.,!?;:])\s*/g, '$1 ')
      .trim();

    const dashOnlyText = normalized.replace(/\s/g, '');
    if (
      dashOnlyText.length >= 3 &&
      /^[\-‐‑‒–—―−⁓⸺⸻﹘﹣－]+$/u.test(dashOnlyText)
    ) {
      return '';
    }

    return normalized;
  };

  // if can find a readable node, else stop tts
  // FIXED: Added proper boundary checks to prevent stack overflow
  this.findNextTextNode = (depth = 0) => {
    // Prevent deep recursion
    if (depth > 500) {
      console.warn('TTS: findNextTextNode max depth reached');
      return false;
    }

    if (this.currentElement.isSameNode(reader.chapterElement) && this.started) {
      return false;
    } else {
      this.started = true;
    }

    // Safety check: ensure currentElement is valid
    if (!this.currentElement || !this.currentElement.nodeName) {
      return false;
    }

    // is read, have to go next or go back
    if (this.currentElement.isSameNode(this.prevElement)) {
      this.prevElement = this.currentElement;
      if (this.currentElement.nextElementSibling) {
        this.currentElement = this.currentElement.nextElementSibling;
        return this.findNextTextNode(depth + 1);
      } else if (
        this.currentElement.parentElement &&
        !this.currentElement.parentElement.isSameNode(document.body) &&
        !this.currentElement.parentElement.isSameNode(document.documentElement)
      ) {
        this.currentElement = this.currentElement.parentElement;
        return this.findNextTextNode(depth + 1);
      } else {
        return false;
      }
    } else {
      // can read? read it
      if (this.readable()) {
        return true;
      }
      if (
        !this.prevElement?.parentElement?.isSameNode(this.currentElement) &&
        this.currentElement.firstElementChild
      ) {
        // go deep
        this.prevElement = this.currentElement;
        this.currentElement = this.currentElement.firstElementChild;
        return this.findNextTextNode(depth + 1);
      } else if (this.currentElement.nextElementSibling) {
        this.prevElement = this.currentElement;
        this.currentElement = this.currentElement.nextElementSibling;
        return this.findNextTextNode(depth + 1);
      } else if (
        this.currentElement.parentElement &&
        !this.currentElement.parentElement.isSameNode(document.body) &&
        !this.currentElement.parentElement.isSameNode(document.documentElement)
      ) {
        this.prevElement = this.currentElement;
        this.currentElement = this.currentElement.parentElement;
        return this.findNextTextNode(depth + 1);
      } else {
        return false;
      }
    }
  };

  this.next = () => {
    if (!this.started) return;
    reader.post({ type: 'tts-command', data: { command: 'next' } });
  };

  this.previous = () => {
    if (!this.started) return;
    reader.post({ type: 'tts-command', data: { command: 'previous' } });
  };

  this.start = element => {
    const startElement = element ?? reader.chapterElement;

    const readableEntries = this.getAllReadableElements(reader.chapterElement)
      .map(readableElement => ({
        element: readableElement,
        text: this.normalizeText(readableElement.innerText),
      }))
      .filter(entry => !!entry.text);
    this.allReadableElements = readableEntries.map(entry => entry.element);
    this.totalElements = this.allReadableElements.length;
    this.textQueue = readableEntries.map(entry => entry.text);

    const requestedIndex =
      element && element !== reader.chapterElement
        ? this.allReadableElements.indexOf(startElement)
        : 0;
    const startIndex = requestedIndex >= 0 ? requestedIndex : 0;

    this.started = this.totalElements > 0;
    this.reading = this.started;
    this.setActiveIndex(startIndex);
    reader.post({
      type: 'tts-queue',
      data: {
        queue: this.textQueue,
        startIndex,
      },
    });
  };

  // Get all readable elements in order
  this.getAllReadableElements = element => {
    const elements = [];
    const traverse = el => {
      if (!el) return;
      if (this.readable(el)) {
        elements.push(el);
        // innerText already includes readable descendants, so descending any
        // further would add overlapping text to the speech queue.
        return;
      }
      for (let i = 0; i < el.children.length; i++) {
        traverse(el.children[i]);
      }
    };
    traverse(element);
    return elements;
  };

  this.resume = () => {
    if (!this.started) return;
    reader.post({ type: 'tts-command', data: { command: 'play' } });
  };

  this.pause = () => {
    if (!this.started) return;
    reader.post({ type: 'tts-command', data: { command: 'pause' } });
  };

  this.rewind = () => {
    if (!this.started) return;
    reader.post({ type: 'tts-command', data: { command: 'replay' } });
  };

  this.seekTo = index => {
    if (!this.started || !this.allReadableElements.length) return;
    const targetIndex = Math.max(0, Math.min(index, this.totalElements - 1));
    reader.post({
      type: 'tts-command',
      data: { command: 'seekTo', index: targetIndex },
    });
  };

  this.stop = () => {
    reader.post({ type: 'tts-command', data: { command: 'stop' } });
    this.reset();
  };

  this.reset = () => {
    this.currentElement?.classList?.remove('highlight');
    this.prevElement = null;
    this.currentElement = reader.chapterElement;
    this.started = false;
    this.reading = false;
    this.elementsRead = 0;
    this.totalElements = 0;
    this.allReadableElements = [];
    this.textQueue = [];
    const playPauseButton = document.getElementById('TTS-PlayPause');
    if (playPauseButton) playPauseButton.innerHTML = resumeIcon;
    const progress = document.getElementById('TTS-Progress');
    if (progress) progress.textContent = '';
  };

  this.setActiveIndex = index => {
    if (!this.allReadableElements.length) return;
    const targetIndex = Math.max(0, Math.min(index, this.totalElements - 1));
    this.currentElement?.classList?.remove('highlight');
    this.currentElement = this.allReadableElements[targetIndex];
    this.elementsRead = targetIndex + 1;
    this.started = true;
    this.scrollToElement(this.currentElement);
    this.currentElement.classList.add('highlight');
    const progress = document.getElementById('TTS-Progress');
    if (progress) {
      progress.textContent = `${targetIndex + 1}/${this.totalElements}`;
    }
  };

  this.setPlaybackState = state => {
    this.reading = state === 'playing';
    if (state === 'error') {
      this.reset();
      return;
    }
    const playPauseButton = document.getElementById('TTS-PlayPause');
    if (playPauseButton) {
      playPauseButton.innerHTML = this.reading ? pauseIcon : resumeIcon;
    }
  };

  this.complete = () => {
    this.reading = false;
    if (
      reader.readerSettings.val.tts?.autoPageAdvance === true &&
      reader.nextChapter
    ) {
      reader.post({ type: 'next', autoStartTTS: true });
      return;
    }
    this.reset();
  };

  this.isElementInViewport = element => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const windowWidth =
      window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= windowHeight &&
      rect.right <= windowWidth
    );
  };

  // UPDATED: Scroll to top or center based on settings with padding for notch/camera
  this.scrollToElement = element => {
    if (!element) return;
    // Check if element is partially visible (at least some part is in viewport)
    const rect = element.getBoundingClientRect();
    if (reader.generalSettings.val.pageReader) {
      const relativePage = Math.floor(
        (rect.left + rect.width / 2) / reader.layoutWidth,
      );
      pageReader.movePage(
        Math.max(
          0,
          Math.min(
            pageReader.totalPages.val - 1,
            pageReader.page.val + relativePage,
          ),
        ),
      );
      return;
    }
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const isPartiallyVisible =
      rect.top < windowHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0;

    // Only scroll if element is not visible or barely visible
    if (!isPartiallyVisible || rect.top < 0 || rect.bottom > windowHeight) {
      // Check scrollToTop setting (default to true for better reading experience)
      const scrollToTop = reader.readerSettings.val.tts?.scrollToTop !== false;

      if (scrollToTop) {
        // Scroll to top with padding for notch/camera (80px from top)
        const elementTop =
          element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementTop - 80; // 80px padding for notch/camera

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      } else {
        // Center scroll (original behavior)
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    }
  };

  this.speak = () => {
    this.rewind();
  };
})();

