/* ============================================================
 * window.common 네임스페이스 초기화
 * (common.js가 이미 존재하는 프로젝트라면 이 블록은 생략하고
 *  기존 common.js 파일 안에 CommonPagination만 추가하면 됨)
 * ============================================================ */
window.common = window.common || {};

/* 이 컴포넌트에 고정된 페이지 크기 설정 (create options 로 변경 불가) */
const FIXED_ROWS_PER_PAGE_OPTIONS = Object.freeze([20, 50, 100]);
const FIXED_DEFAULT_ROWS_PER_PAGE = 20;   // 초기 선택 크기 (FIXED_ROWS_PER_PAGE_OPTIONS 중 하나)

/* ============================================================
 * common.CommonPagination
 * ------------------------------------------------------------
 * 사용법:
 *   const paging = common.CommonPagination.create('grid1', {
 *     totalPages: 12,
 *     currentPage: 1,
 *     hiddenRowsPerPage: [20],   // (선택) 드롭다운에서 숨길 건수. 예: 20건 미노출
 *     onPageChange(page) { ... },
 *     onRowsPerPageChange(size) { ... },
 *   });
 *   // ※ 페이지 크기 목록/기본값은 pagination.js 상단 상수로 고정.
 *   //    create options 로 목록 자체는 못 바꾸고, hiddenRowsPerPage 로 숨기기만 가능.
 *
 *   paging.setPage(3);
 *   paging.setTotalPages(20);
 *   paging.getState();
 * ============================================================ */
window.common.CommonPagination = {

  /**
   * 인스턴스 생성
   * @param {string} elementId - 렌더링할 대상 엘리먼트의 id
   * @param {object} options
   * @returns {object} 인스턴스 컨트롤러 (setPage, setRowsPerPage, setTotalPages, getState, destroy)
   */
  create(elementId, options = {}) {
    if (options === null || typeof options !== 'object' || Array.isArray(options)) options = {};

    const container = document.getElementById(elementId);
console.log("ddddddddddddd")
    if (!container) {
      console.error(`[CommonPagination] element를 찾을 수 없습니다: #${elementId}`);
      return null;
    }

    // 특정 건수를 드롭다운에서 숨김 (create options 로 지정)
    //   예: create(id, { hiddenRowsPerPage: [20] }) -> 20건 옵션 미노출
    const hiddenRowsPerPage = Array.isArray(options.hiddenRowsPerPage)
      ? options.hiddenRowsPerPage.filter(function (size) { return FIXED_ROWS_PER_PAGE_OPTIONS.includes(size); })
      : [];
    const visibleRowsPerPageOptions = Object.freeze(
      FIXED_ROWS_PER_PAGE_OPTIONS
        .filter(function (size) { return !hiddenRowsPerPage.includes(size); })
        .sort(function (a, b) { return a - b; })   // 항상 오름차순 (20, 50, 100)
    );
    // 기본 선택 크기가 숨김 대상이면, 보이는 첫 옵션으로 대체
    const defaultRowsPerPage = hiddenRowsPerPage.includes(FIXED_DEFAULT_ROWS_PER_PAGE)
      ? (visibleRowsPerPageOptions[0] ?? FIXED_DEFAULT_ROWS_PER_PAGE)
      : FIXED_DEFAULT_ROWS_PER_PAGE;

    // 숫자 문자열은 변환하지 않음. 생성 시 잘못된 값은 기본값으로 대체하고,
    // 공개 setter에 전달된 잘못된 값은 상태 변경/콜백 호출 없이 무시한다.
    function isPositiveInteger(value) {
      return Number.isSafeInteger(value) && value > 0;
    }

    function isValidTotalCount(value) {
      return Number.isSafeInteger(value) && value >= 0;
    }

    const initialTotalPages = isPositiveInteger(options.totalPages) ? options.totalPages : 1;
    const initialCurrentPage = isPositiveInteger(options.currentPage)
      ? Math.min(options.currentPage, initialTotalPages)
      : 1;

    // ---- 내부 상태 (클로저로 캡슐화, 외부에서 직접 접근 불가) ----
    const state = {
      totalPages: initialTotalPages,
      totalCount: isValidTotalCount(options.totalCount) ? options.totalCount : 0,   // 전체 건수 (setTotalCount 로 갱신)
      currentPage: initialCurrentPage,
      // 옵션 목록/기본값은 고정 세트에서 파생 (create options 로 세트 자체는 못 바꾸고, 숨김만 가능)
      rowsPerPageOptions: visibleRowsPerPageOptions,
      rowsPerPage: defaultRowsPerPage,
      maxVisiblePages: isPositiveInteger(options.maxVisiblePages) ? options.maxVisiblePages : 5,
      sizeMenuOpen: false,
    };

    const callbacks = {
      onPageChange: typeof options.onPageChange === 'function' ? options.onPageChange : (() => {}),
      onRowsPerPageChange: typeof options.onRowsPerPageChange === 'function' ? options.onRowsPerPageChange : (() => {}),
    };

    // ---- 바깥 클릭 시 드롭다운 닫기 (인스턴스별로 등록/해제) ----
    function handleOutsideClick(e) {
      if (state.sizeMenuOpen && !container.contains(e.target)) {
        state.sizeMenuOpen = false;
        render();
      }
    }
    document.addEventListener('click', handleOutsideClick);

    // ---- 컨테이너 클릭 이벤트 위임 (렌더마다 리스너 재등록하지 않고 한 번만 등록) ----
    function handleContainerClick(e) {
      const pageBtn = e.target.closest('.pg-page');
      if (pageBtn) { setPage(Number(pageBtn.dataset.page)); return; }

      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.dataset.action;
        if (action === 'prev') setPage(prevBlockFirstPage());
        else if (action === 'next') setPage(nextBlockFirstPage());
        else if (action === 'toggle-size') {
          e.stopPropagation();   // 열자마자 outside-click 으로 닫히는 것 방지
          state.sizeMenuOpen = !state.sizeMenuOpen;
          render();
        }
        return;
      }

      const sizeOpt = e.target.closest('.pg-size-option');
      if (sizeOpt) { setRowsPerPage(Number(sizeOpt.dataset.size)); return; }
    }
    container.addEventListener('click', handleContainerClick);

    // ---- DOM 생성 헬퍼 ----
    function domHelper(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    // 이전/다음 화살표 버튼 생성 (SVG 대신 텍스트 문자 사용)
    function makeArrow(action, disabled, label, ariaLabel) {
      const btn = domHelper('button', 'pg-arrow', label);
      btn.dataset.action = action;
      btn.disabled = disabled;
      btn.setAttribute('aria-label', ariaLabel);
      return btn;
    }

    // ---- 내부 함수들 ----
    // 현재 페이지가 속한 "블록"의 페이지 범위 (예: 1~5, 6~10, 11~15 …)
    function getVisiblePageRange() {
      const blockSize = state.maxVisiblePages;
      const blockIndex = Math.floor((state.currentPage - 1) / blockSize);
      const start = blockIndex * blockSize + 1;
      const end = Math.min(start + blockSize - 1, state.totalPages);
      return { start, end };
    }

    // 다음/이전 블록의 첫 페이지 번호
    function nextBlockFirstPage() {
      const blockSize = state.maxVisiblePages;
      const blockIndex = Math.floor((state.currentPage - 1) / blockSize);
      return (blockIndex + 1) * blockSize + 1;   // 다음 블록 첫 페이지
    }
    function prevBlockFirstPage() {
      const blockSize = state.maxVisiblePages;
      const blockIndex = Math.floor((state.currentPage - 1) / blockSize);
      return (blockIndex - 1) * blockSize + 1;    // 이전 블록 첫 페이지
    }

    function render() {
      const frag = document.createDocumentFragment();
      const toolbar = domHelper('div', 'pg-toolbar');

      // 페이지 이동 영역
      const pagination = domHelper('div', 'pg-pagination');
      const { start, end } = getVisiblePageRange();

      // 이전 블록 버튼: 현재 블록의 첫 페이지가 1이면(=첫 블록) 비활성
      pagination.appendChild(
        makeArrow('prev', start === 1, '<', '이전 블록')
      );

      for (let p = start; p <= end; p++) {
        const btn = domHelper('button', 'pg-page' + (p === state.currentPage ? ' active' : ''), String(p));
        btn.dataset.page = p;
        pagination.appendChild(btn);
      }

      // 다음 블록 버튼: 현재 블록의 마지막 페이지가 전체 페이지면(=마지막 블록) 비활성
      pagination.appendChild(
        makeArrow('next', end === state.totalPages, '>', '다음 블록')
      );
      toolbar.appendChild(pagination);

      // 페이지 크기 선택 영역
      const sizeSelect = domHelper('div', 'pg-size-select' + (state.sizeMenuOpen ? ' open' : ''));

      const sizeBtn = domHelper('button', 'pg-size-btn');
      sizeBtn.dataset.action = 'toggle-size';
      sizeBtn.appendChild(domHelper('span', null, state.rowsPerPage + '건'));
      sizeBtn.appendChild(domHelper('span', 'pg-size-caret', '▾'));   // 드롭다운 화살표 (텍스트)
      sizeSelect.appendChild(sizeBtn);

      const menu = domHelper('div', 'pg-size-menu');
      state.rowsPerPageOptions.forEach(function (size) {
        const opt = domHelper('div', 'pg-size-option' + (size === state.rowsPerPage ? ' selected' : ''), size + '건');
        opt.dataset.size = size;
        menu.appendChild(opt);
      });
      sizeSelect.appendChild(menu);
      toolbar.appendChild(sizeSelect);

      frag.appendChild(toolbar);
      container.replaceChildren(frag);   // 기존 내용 비우고 한 번에 교체
    }

    // ---- 외부에 노출할 API ----
    function setPage(page) {
      if (!isPositiveInteger(page) || page > state.totalPages || page === state.currentPage) return;
      state.currentPage = page;
      render();
      callbacks.onPageChange(page);
    }

    function setRowsPerPage(size) {
      if (!state.rowsPerPageOptions.includes(size)) return;
      state.rowsPerPage = size;
      state.sizeMenuOpen = false;
      // 크기가 바뀌면 저장된 전체 건수 기준으로 totalPages 재계산
      state.totalPages = calcTotalPages(state.totalCount, size);
      render();
      callbacks.onRowsPerPageChange(size);
    }

    function setTotalPages(totalPages) {
      if (!isPositiveInteger(totalPages)) return;
      state.totalPages = totalPages;
      if (state.currentPage > totalPages) state.currentPage = totalPages;
      render();
    }

    // 전체 건수(totalCount)를 넣으면 rowsPerPage 기준으로 totalPages 를 계산해 반영
    function setTotalCount(totalCount) {
      if (!isValidTotalCount(totalCount)) return;
      state.totalCount = totalCount;
      setTotalPages(calcTotalPages(totalCount, state.rowsPerPage));
    }

    // 전체 건수 / 페이지당 건수 -> 전체 페이지 수 (최소 1)
    function calcTotalPages(totalCount, rowsPerPage) {
      return Math.max(Math.ceil((totalCount || 0) / rowsPerPage), 1);
    }

    function getState() {
      // 외부에 원본 state 참조를 넘기지 않고 복사본만 전달 (캡슐화 유지)
      return { ...state };
    }

    function destroy() {
      document.removeEventListener('click', handleOutsideClick);
      container.removeEventListener('click', handleContainerClick);
      container.replaceChildren();
    }

    // ---- 최초 렌더링 ----
    render();

    // ---- 인스턴스 컨트롤러 반환 ----
    return {
      setPage,
      setRowsPerPage,
      setTotalPages,
      setTotalCount,
      getState,
      destroy,
    };
  },

};
