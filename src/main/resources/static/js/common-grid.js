/**
 * 공통 그리드 설정
 * - 모든 페이지의 index.js보다 먼저 로드되어야 함
 */

Tabulator.extendModule("format", "formatters", {
    // 사용여부 등 boolean 데이터를 실제 체크박스로 표시/편집하는 공통 formatter
    // 컬럼 정의에서 formatter: "checkbox" 만 지정하면 됨
    checkbox: function (cell, formatterParams, onRendered) {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!cell.getValue();

        // 체크박스 변경 시 셀 데이터 갱신 + 수정 상태 마킹
        input.addEventListener("change", function () {
            cell.setValue(input.checked);
            GridUtil.markState(cell.getRow(), "modified");
        });

        // 클릭이 행 선택 등 상위로 전파되지 않도록 차단
        input.addEventListener("click", function (e) {
            e.stopPropagation();
        });

        return input;
    },

    // 셀에 버튼을 표시하는 공통 formatter
    // 컬럼 정의 예:
    //   formatter: "button",
    //   formatterParams: { label: "상세", onClick: function (e, cell) { ... } }
    button: function (cell, formatterParams, onRendered) {
        const params = formatterParams || {};
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = params.className || "grid-btn";
        btn.textContent = params.label || "버튼";

        btn.addEventListener("click", function (e) {
            // 행 선택 등 상위로 전파되지 않도록 차단
            e.stopPropagation();
            if (typeof params.onClick === "function") {
                params.onClick(e, cell);
            }
        });

        return btn;
    },

    // 셀 값을 색상 뱃지(태그)로 표시하는 공통 formatter
    // 컬럼 정의 예:
    //   formatter: "tag",
    //   formatterParams: {
    //     colors: { Active: "#2DC214", Inactive: "#999" }, // 값별 배경색
    //     labels: { Active: "사용중" },                      // (선택) 표시 텍스트 치환
    //     defaultColor: "#999"                               // (선택) 미매칭 시 색
    //   }
    tag: function (cell, formatterParams, onRendered) {
        const params = formatterParams || {};
        const value = cell.getValue();
        if (value === null || value === undefined || value === "") return "";

        const colors = params.colors || {};
        const labels = params.labels || {};
        const span = document.createElement("span");
        span.className = "grid-tag";
        span.textContent = labels[value] || value;
        span.style.backgroundColor = colors[value] || params.defaultColor || "#999";
        console.log("span : ", span);
        // 컬럼에 hozAlign을 지정하지 않아도 항상 가운데 정렬되도록 래퍼로 감쌈
        const wrap = document.createElement("div");
        wrap.style.textAlign = "center";
        wrap.appendChild(span);
        return wrap;
    }
});

/**
 * 그리드 변경 상태(row state) 추적 유틸
 *
 * 각 row 데이터에 _state 필드를 심어 서버 저장 시 분기에 활용한다.
 *   _state: "new"      → INSERT
 *   _state: "modified" → UPDATE
 *   _state: "deleted"  → DELETE  (별도 보관, 그리드에서는 제거)
 *   _state 없음         → 변경 없음(무시)
 *
 * 삭제된 row는 grid.getData()에 잡히지 않으므로 table 인스턴스에 별도 보관한다.
 */
window.GridUtil = {
    // formatter별 컬럼 기본 옵션.
    // 컬럼 정의에 해당 옵션을 명시하지 않은 경우에만 자동 주입된다.
    _formatterDefaults: {
        image: { headerSort: false },
        button: { headerSort: false },
        checkbox: { headerSort: false }
    },

    /**
     * 컬럼 정의 배열을 전처리해 formatter별 기본 옵션을 자동 적용한다.
     * 사용: columns: GridUtil.columns([ ... ])
     * 컬럼에 옵션을 직접 지정하면 그 값이 우선한다.
     */
    columns: function (defs) {
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
     * row에 변경 상태를 마킹한다.
     * 'new' 상태는 계속 INSERT 대상이어야 하므로 'modified'로 덮지 않는다.
     * re-render를 피하기 위해 data 객체를 직접 수정한다.
     */
    markState: function (row, state) {
        const data = row.getData();
        if (data._state === "new") return; // 신규 row는 상태 유지
        data._state = state;
    },

    /**
     * 신규 row를 추가한다. (_state = "new")
     * @returns {Promise} Tabulator addRow Promise
     */
    addRow: function (table, rowData) {
        const data = Object.assign({}, rowData);
        data._state = "new";
        return table.addRow(data);
    },

    /**
     * row를 삭제 처리한다.
     * - 기존 row: _state="deleted"로 표시 후 table._deletedRows에 보관하고 그리드에서 제거
     * - 신규(new) row: 서버 전송 불필요하므로 그냥 제거
     */
    deleteRow: function (row) {
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
     * 변경분을 모아서 반환한다.
     * @returns {{upserts: Object[], deletes: Object[], all: Object[]}}
     *   upserts: 신규 + 수정 row, deletes: 삭제 row
     */
    getChanges: function (table) {
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

    /**
     * 모든 변경 상태를 초기화한다. (저장 성공 후 호출)
     */
    clearState: function (table) {
        table.getData().forEach(function (d) {
            delete d._state;
        });
        table._deletedRows = [];
    }
};
