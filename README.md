# 어디 뒀지?

물건을 어디에 보관했는지 기록하고, 필요할 때 엄마에게 묻듯 찾아보는 모바일 앱입니다.

현재 Phase 0에서는 앱을 열어 **엄마에게 물어보기**에서 **보관함**으로 이동할 수 있습니다. 폴더 저장은 Phase 1에서 시작합니다.

## 로컬 실행

Node.js 22.13 이상과 npm이 필요합니다. Android에서는 Expo SDK 58을 지원하는 Expo Go를 사용합니다.

```sh
npm ci
npm start
```

실기기에서는 같은 네트워크에 연결한 뒤 Expo Go에서 QR 코드를 스캔합니다. Android 가상 기기가 실행 중이면 `npm run android`로 열 수 있습니다.

## 검증

```sh
npm run typecheck
npm test
npm run build:android
```

`build:android`는 Metro로 Android용 번들을 `dist/`에 내보냅니다. 단말에서는 앱을 열어 홈이 표시되는지, 보관함이 열리는지, 뒤로 가기로 홈에 돌아오는지 확인합니다.

제품 요구사항은 [docs/PRODUCT.md](docs/PRODUCT.md)에 있습니다.
