import { TabulatorFull as Tabulator } from 'tabulator-tables';

/* ────────────────────────────────────────────────────────────
 * 공통 formatter 등록
 * ──────────────────────────────────────────────────────────── */
Tabulator.extendModule("format", "formatters", {
  // boolean 데이터를 실제 체크박스로 표시/편집 (formatter: "checkbox")
  checkbox(cell) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!cell.getValue();

    input.addEventListener("change", function () {
      cell.setValue(input.checked);
      window.common.CommonGrid.markState(cell.getRow(), "modified");
    });
    input.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    return input;
  },

  // 셀에 버튼 표시 (formatter: "button", formatterParams: { label, onClick, className })
  button(cell, formatterParams) {
    const params = formatterParams || {};
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = params.className || "grid-btn";
    btn.textContent = params.label || "버튼";

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (typeof params.onClick === "function") {
        params.onClick(e, cell);
      }
    });

    return btn;
  },

  // 셀 값을 색상 뱃지로 표시 (formatter: "tag", formatterParams: { colors, labels, defaultColor })
  tag(cell, formatterParams) {
    const params = formatterParams || {};
    const value = cell.getValue();
    if (value === null || value === undefined || value === "") return "";

    const colors = params.colors || {};
    const labels = params.labels || {};
    const span = document.createElement("span");
    span.className = "grid-tag";
    span.textContent = labels[value] || value;
    span.style.backgroundColor = colors[value] || params.defaultColor || "#999";

    // 컬럼에 hozAlign을 지정하지 않아도 항상 가운데 정렬
    const wrap = document.createElement("div");
    wrap.style.textAlign = "center";
    wrap.appendChild(span);
    return wrap;
  }
});

/* ────────────────────────────────────────────────────────────
 * CommonGrid : 그리드 생성 + 변경상태(row state) 추적 유틸
 *
 *   _state: "new"      → INSERT
 *   _state: "modified" → UPDATE
 *   _state: "deleted"  → DELETE (별도 보관, 그리드에서는 제거)
 *   _state 없음         → 변경 없음(무시)
 * ──────────────────────────────────────────────────────────── */
window.common = window.common || {};
const instances = {};

window.common.CommonGrid = {
  // formatter별 컬럼 기본 옵션 (컬럼에 직접 지정하지 않은 경우에만 주입)
  _formatterDefaults: {
    image: { headerSort: false },
    button: { headerSort: false },
    checkbox: { headerSort: false }
  },

  /**
   * 그리드 생성. 공통 기본 옵션(pagination·locale)을 병합한다.
   * @returns {Tabulator} 생성된 테이블 인스턴스
   */
  create(elementId, options) {
    instances[elementId]?.destroy();

    const table = new Tabulator('#' + elementId, {
      paginationSize: 10,
      paginationSizeSelector: [10, 30, 100],
      locale: "ko-kr",
      langs: {
        "ko-kr": {
          "pagination": {
            "first": "<<",
            "last": ">>",
            "prev": "<",
            "nest": "<"
          }
        }
      },
      ...options
    });

    // 표준 에디터 편집 시 수정 상태 자동 마킹
    // ※ Tabulator 6.x에서는 생성자 옵션이 아닌 이벤트(table.on)로 등록해야 동작함
    table.on("cellEdited", function (cell) {
      window.common.CommonGrid.markState(cell.getRow(), "modified");
    });

    instances[elementId] = table;
    return table;
  },

  /** 저장된 테이블 인스턴스 조회 */
  getInstance(elementId) {
    return instances[elementId];
  },

  /**
   * 컬럼 정의 배열을 전처리해 formatter별 기본 옵션을 자동 적용한다.
   * 사용: columns: common.CommonGrid.columns([ ... ])
   */
  columns(defs) {
    const defaults = this._formatterDefaults;
    return (defs || []).map(function (def) {
      const preset = defaults[def.formatter];
      if (preset) {
        Object.keys(preset).forEach(function (key) {
          if (!(key in def)) def[key] = preset[key];
        });
      }
      return def;
    });
  },

  /**
   * row에 변경 상태를 마킹한다. ('new'는 유지, re-render 회피 위해 data 직접 수정)
   */
  markState(row, state) {
    const data = row.getData();
    if (data._state === "new") return;
    data._state = state;
  },

  /** 신규 row 추가 (_state = "new") */
  addRow(table, rowData) {
    const data = Object.assign({}, rowData);
    data._state = "new";
    return table.addRow(data);
  },

  /**
   * row 삭제 처리.
   * - 기존 row: _state="deleted"로 표시 후 table._deletedRows에 보관하고 제거
   * - 신규(new) row: 서버 전송 불필요하므로 그냥 제거
   */
  deleteRow(row) {
    const table = row.getTable();
    const data = row.getData();
    if (data._state !== "new") {
      data._state = "deleted";
      if (!table._deletedRows) table._deletedRows = [];
      table._deletedRows.push(data);
    }
    row.delete();
  },

  /**
   * 변경분을 모아 반환한다.
   * @returns {{upserts: Object[], deletes: Object[], all: Object[]}}
   */
  getChanges(table) {
    const upserts = table.getData().filter(function (d) {
      return d._state === "new" || d._state === "modified";
    });
    const deletes = table._deletedRows || [];
    return {
      upserts: upserts,
      deletes: deletes,
      all: upserts.concat(deletes)
    };
  },

  /** 모든 변경 상태 초기화 (저장 성공 후 호출) */
  clearState(table) {
    table.getData().forEach(function (d) {
      delete d._state;
    });
    table._deletedRows = [];
  }
};
