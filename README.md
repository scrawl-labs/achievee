# 플래너

나만 쓰는 일정 + 할 일 + 가계부 앱.

## 실행
    npm install
    npm run dev      # 같은 와이파이의 폰에서는 터미널에 나온 Network 주소로 접속
    npm test
    npm run build

## 데이터
브라우저 localStorage(`daily-garden:v1`)에 저장돼요. 브라우저/기기마다 따로 저장되고, 나중에 DB로 옮길 때는 `src/storage/`에 `DataStorage` 구현체를 추가해서 `src/store/index.ts`에서 교체하면 돼요.
