// Google Drive API 설정
// 이 파일을 수정하여 자신의 Google API 크리덴셜을 설정하세요

const GOOGLE_CONFIG = {
    // Google Cloud Console에서 발급받은 OAuth 2.0 클라이언트 ID
    // https://console.cloud.google.com/apis/credentials
    CLIENT_ID: '499984957959-eqciqe3ee7tu6jf2vvmckqhpa2d5bthb.apps.googleusercontent.com',
    
    // Google Cloud Console에서 발급받은 API 키
    // https://console.cloud.google.com/apis/credentials
    API_KEY: 'AIzaSyDTKnUV7rE64QAAlDE7ZgnSOT0em9wEgrs'
};

// 설정 적용
if (typeof window !== 'undefined' && window.driveManager) {
    window.driveManager.CLIENT_ID = GOOGLE_CONFIG.CLIENT_ID;
    window.driveManager.API_KEY = GOOGLE_CONFIG.API_KEY;
} else {
    // DOM 로드 후 설정 적용
    document.addEventListener('DOMContentLoaded', () => {
        if (window.driveManager) {
            window.driveManager.CLIENT_ID = GOOGLE_CONFIG.CLIENT_ID;
            window.driveManager.API_KEY = GOOGLE_CONFIG.API_KEY;
            
            // API 키가 설정되어 있으면 Google API 초기화
            if (GOOGLE_CONFIG.CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && 
                GOOGLE_CONFIG.API_KEY !== 'YOUR_GOOGLE_API_KEY_HERE') {
                window.driveManager.initializeGoogleAPI();
            }
        }
    });
}
