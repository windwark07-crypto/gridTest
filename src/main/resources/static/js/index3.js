document.addEventListener("DOMContentLoaded", function () {
    const CommonGrid = window.common.CommonGrid;

    const table = CommonGrid.create("serviceGrid", {
        pagination: false,   // 내장 페이징 사용 안 함 -> 커스텀 페이저가 API로 페이지 데이터 조회
        layout: "fitData",
        // height: "400px",
        width: "1000px",
        movableRows: true,   // 행 드래그 이동 (핸들은 아래 columns의 2번째에 직접 배치)
        // selectableRows: true,
        // 모든 컬럼 헤더를 기본 가운데 정렬
        columnDefaults: {
            headerHozAlign: "center"
        },
        columns: CommonGrid.columns([
            {
                title: "선택",
                field: "use",
                formatter: "checkbox",
                hozAlign: "center",
                width: 40,
                cssClass: "no-style"
                // headerSort: false,
            },
            {
                // 행 이동 드래그 핸들 (2번째 컬럼)
                title: "순서",
                rowHandle: true,
                formatter: "handle",
                headerSort: false,
                hozAlign: "center",
                width: 40,
                resizable: false
            },
            { title: "ID", field: "id", width: 80 },
            {
                title: "사진",
                field: "photo",
                hozAlign: "center",
                width: 70,
                formatter: "image",
                formatterParams: { height: "32px", width: "32px" },
            },
            { title: "Name", field: "name", width: 100},
            { title: "Age", field: "age", editor: "number", editorParams: { min: 0, max: 150 } , width: 200},
            { title: "MEMO", field: "memo", editor: "input", cssClass: "editable-input" ,width: 300},
            {
                title: "Status",
                field: "status",
                formatter: "tag",
                formatterParams: {
                    colors: { Active: "#2DC214", Inactive: "#CE1515" },
                    labels: { Active: "사용중", Inactive: "미사용" }
                },
                width: 100
            },
        ]),
        data: [],   // 초기 데이터 없음 -> 커스텀 페이저가 API로 1페이지 조회해 채움
    });

    // ── 커스텀 페이저 (pagination.js: common.CommonPagination) ───────────
    let paging;   // 페이저 컨트롤러 (페이지 크기는 paging.getState().rowsPerPage 로 조회)

    /**
     * (모의) 서버 조회 API — 실제로는 아래를 fetch 로 교체:
     *   fetch(`/api/services?page=${page}&size=${size}`).then(r => r.json())
     * 반환 형식: { rows: [...현재 페이지 행...], total: 전체건수 }
     */
    function fetchServiceList(page, size) {
        return new Promise(function (resolve) {
            setTimeout(function () {   // 네트워크 지연 흉내
                const start = (page - 1) * size;
                resolve({
                    rows: MOCK_SERVER_DATA.slice(start, start + size),
                    total: MOCK_SERVER_DATA.length
                });
            }, 150);
        });
    }

    // 페이지 로드: API 조회 -> 그리드 데이터 교체 -> 전체 건수만 전달(페이지 수 계산은 컴포넌트가)
    function loadPage(page) {
        const size = paging.getState().rowsPerPage;   // 컴포넌트가 들고 있는 현재 크기
        fetchServiceList(page, size).then(function (res) {
            table.replaceData(res.rows);   // 현재 페이지 데이터만 표시
            paging.setTotalCount(res.total);   // 총 건수 -> 컴포넌트가 totalPages 계산
        });
    }

    // 페이저 컴포넌트 생성 (페이지/크기 변경 시 API 재조회)
    paging = common.CommonPagination.create("customPager", {
        totalPages: 1,
        currentPage: 1,
        onPageChange: function (page) {
            loadPage(page);
        },
        onRowsPerPageChange: function () {
            // 크기 변경 시 1페이지로 이동 (loadPage가 최신 크기를 getState로 읽음)
            if (paging.getState().currentPage !== 1) {
                paging.setPage(1);   // setPage(1)이 onPageChange -> loadPage(1) 호출
            } else {
                loadPage(1);         // 이미 1페이지면 직접 로드
            }
        }
    });

    // 그리드 렌더 완료 후 1페이지 조회
    table.on("tableBuilt", function () { loadPage(1); });

    // ── 툴바 버튼 ──────────────────────────────────────────────
    // 행 추가 (_state = "new")
    document.getElementById("btnAddRow").addEventListener("click", function () {
        CommonGrid.addRow(table, { name: "", age: 0, memo: "", status: "", gender: "01", use: false });
    });

    // 선택 행 삭제 (_state = "deleted", 삭제분은 별도 보관)
    document.getElementById("btnDeleteRow").addEventListener("click", function () {
        const rows = table.getSelectedRows();
        if (rows.length === 0) {
            alert("삭제할 행을 선택하세요.");
            return;
        }
        rows.forEach(function (row) {
            CommonGrid.deleteRow(row);
        });
    });

    // 변경분 저장 (서버 전송 대신 콘솔 출력으로 확인)
    document.getElementById("btnSave").addEventListener("click", function () {
        const changes = CommonGrid.getChanges(table);
        console.log("신규+수정:", changes.upserts);
        console.log("삭제:", changes.deletes);
        console.log("서버 전송 대상(all):", changes.all);
        alert("변경 " + changes.all.length + "건 (신규/수정 " + changes.upserts.length + ", 삭제 " + changes.deletes.length + ")\n콘솔에서 상세 확인");
        // 실제로는 여기서 changes.all 을 서버로 전송하고,
        // 성공 시 CommonGrid.clearState(table); 호출
    });
});

// 상세 버튼 클릭 이벤트 처리
function onDetailClick(e, cell) {
    const rowData = cell.getRow().getData();
    // TODO: 상세 화면 이동 등 실제 로직으로 교체
    console.log("상세 클릭:", rowData);
    alert("상세 보기 - ID: " + rowData.id + ", 이름: " + rowData.name);
}

// (모의) 서버 전체 데이터 — 실제 API 연동 시 삭제 (서버가 페이지별로 내려줌)
const MOCK_SERVER_DATA = Array.from({ length: 23 }, function (_, i) {
    const id = i + 1;
    const names = ["Alice", "Bob", "Carol", "David", "Eve"];
    return {
        id: id,
        name: names[i % names.length] + id,
        photo: "https://i.pravatar.cc/40?img=" + ((i % 70) + 1),
        age: 20 + (i * 3) % 50,
        memo: "메모" + id,
        status: i % 3 === 0 ? "Inactive" : "Active",
        gender: i % 2 === 0 ? "01" : "02",
        use: i % 2 === 0
    };
});
