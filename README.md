# 🎥 Dual Recorder

웹캠과 화면을 동시에 녹화하고 Google Drive에 자동 업로드할 수 있는 웹 애플리케이션입니다.

## ✨ 주요 기능

- 📹 **웹캠 녹화**: 고품질 웹캠 영상 및 오디오 녹화
- 🖥️ **화면 녹화**: 전체 화면 또는 특정 창 녹화 
- ☁️ **Google Drive 업로드**: 녹화 파일 자동 업로드 (공유 드라이브 지원)
- ⏰ **실시간 타이머**: 녹화 시간 표시
- 💾 **자동 다운로드**: 녹화 완료 시 파일 자동 저장
- 📱 **반응형 디자인**: 모바일과 데스크톱 지원

## 🚀 사용 방법

### 기본 녹화
1. **녹화 시작** 버튼을 클릭합니다
2. 브라우저에서 웹캠과 화면 공유 권한을 허용합니다
3. 녹화가 시작되면 실시간 미리보기와 타이머가 표시됩니다
4. **녹화 중지** 버튼을 클릭하면 자동으로 파일이 다운로드됩니다

### Google Drive 연동 (선택사항)
1. 하단의 **📁 Google Drive 설정** 버튼을 클릭합니다
2. **🔗 Google Drive 연결** 버튼을 클릭하여 Google 계정에 로그인합니다
3. **공유 드라이브 ID**를 입력합니다 (공유 드라이브 URL에서 복사)
4. **업로드 폴더명**을 설정합니다 (기본값: Recordings)
5. **✅ 설정 저장** 버튼을 클릭합니다
6. 이후 녹화 시 자동으로 Google Drive에 업로드됩니다

## 📁 출력 파일

- `webcam_YYMMDD_HHMMSS.webm`: 웹캠 녹화 파일
- `screen_YYMMDD_HHMMSS.webm`: 화면 녹화 파일

### Google Drive 업로드
Google Drive 연동 시 파일이 다음 위치에 저장됩니다:
- **위치**: 공유 드라이브 → 설정한 폴더 (기본: Recordings)
- **파일명**: 로컬 다운로드와 동일

## 🔧 기술 스택

- **HTML5**: 구조 및 레이아웃
- **CSS3**: 스타일링 및 애니메이션
- **JavaScript (ES6+)**: 핵심 로직
- **MediaRecorder API**: 녹화 기능
- **getUserMedia API**: 웹캠 접근
- **getDisplayMedia API**: 화면 공유
- **Google Drive API v3**: 클라우드 스토리지 연동

## 🌐 브라우저 호환성

- Chrome/Edge 73+
- Firefox 72+
- Safari 14.1+

> **참고**: HTTPS 환경에서만 동작합니다 (보안 정책)

## 📋 사용 시나리오

- 🎓 **온라인 강의** 제작
- 💼 **화상 회의** 녹화
- 🎮 **게임 플레이** 녹화
- 📚 **튜토리얼** 제작
- 🔍 **버그 리포트** 작성

## 🔒 개인정보 보호

모든 녹화는 **로컬에서만** 처리되며, 서버로 전송되지 않습니다.

## ⚙️ Google Drive API 설정

Google Drive 업로드 기능을 사용하려면 Google Cloud Console에서 API를 설정해야 합니다:

### 1. Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스** → **라이브러리**에서 "Google Drive API" 활성화
4. **사용자 인증 정보** → **사용자 인증 정보 만들기**

### 2. OAuth 2.0 클라이언트 ID 생성
1. **OAuth 클라이언트 ID** 선택
2. 애플리케이션 유형: **웹 애플리케이션**
3. **승인된 JavaScript 원본**에 도메인 추가:
   - `https://your-username.github.io`
   - `https://localhost:3000` (로컬 테스트용)

### 3. API 키 생성
1. **API 키** 생성
2. **키 제한** → **API 제한**에서 Google Drive API만 선택

### 4. 설정 파일 수정
`config.js` 파일을 열어 발급받은 키를 입력하세요:

```javascript
const GOOGLE_CONFIG = {
    CLIENT_ID: 'your-actual-client-id.googleusercontent.com',
    API_KEY: 'your-actual-api-key'
};
```

## 📱 GitHub Pages 배포

이 프로젝트는 GitHub Pages에서 바로 실행할 수 있습니다:

1. Repository Settings → Pages
2. Source를 "Deploy from a branch" 선택
3. Branch를 "main" 선택
4. `https://username.github.io/repository-name` 에서 접근

## 📋 공유 드라이브 ID 찾기

1. Google Drive에서 공유 드라이브를 엽니다
2. 브라우저 주소창의 URL을 확인합니다
3. URL 형식: `https://drive.google.com/drive/folders/[DRIVE_ID]`
4. `[DRIVE_ID]` 부분을 복사하여 설정에 입력합니다

## 🔒 보안 및 권한

- Google Drive API는 OAuth 2.0을 사용하여 안전하게 인증됩니다
- 앱은 파일 생성 권한만 요청합니다 (`drive.file` 스코프)
- 사용자가 직접 생성한 파일에만 접근 가능합니다
- 모든 데이터는 클라이언트 사이드에서만 처리됩니다

---

**Made with ❤️ for simple screen recording with cloud storage**