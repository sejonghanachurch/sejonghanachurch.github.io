export const SAMPLE = {
  pastor: '위남환',
  address: '세종 금남면 금남구즉로 509',
  mapUrl: 'https://naver.me/xtHCD6aq',
  outreach: {id:'saturday-outreach',title:'토요전도',description:'매주 토요일 오후 1시, 각 셀이 돌아가면서 전도 활동을 합니다.',meeting:'매주 토요일 오후 1시',audience:'각 셀이 돌아가며 참여',image:'',images:[],contentPending:false,mediaPending:true,sample:false},
  cells: [1,2,3,4,5,7,8].map((cellNumber,i)=>({
    id:String(cellNumber), title:`${cellNumber}셀`, eyebrow:'LIFE TOGETHER',leader:'',contentPending:true,mediaPending:true,
    description:[
      '작은 만남 안에 큰 사랑이 자랍니다. 한 주의 삶을 나누고 말씀으로 서로를 세워가는 1셀입니다.',
      '기쁜 날에도, 마음이 무거운 날에도 함께합니다. 서로의 이야기를 듣고 기도로 동행하는 2셀입니다.',
      '일상에서 발견한 은혜를 나눕니다. 말씀을 가까이하고 서로를 따뜻하게 돌보는 3셀입니다.',
      '믿음의 걸음을 함께 걷습니다. 서로 다른 삶이 만나 하나의 공동체를 이루는 4셀입니다.',
      '작은 감사가 모여 큰 기쁨이 됩니다. 함께 웃고 서로를 응원하며 자라가는 5셀입니다.',
      '삶의 자리에서 믿음을 이어갑니다. 말씀을 나누고 이웃을 향한 사랑을 실천하는 7셀입니다.',
      '새로운 만남을 언제나 환영합니다. 함께 배우고 함께 기도하며 믿음의 길을 걷는 8셀입니다.'
    ][i], meeting:'모임 시간은 교회에 문의해 주세요.', location:'모임 장소는 교회에서 안내해 드립니다.', image:`./assets/samples/cell-${cellNumber}.jpg`,images:[],sample:true,imageSample:true
  })),
  education: [
    {id:'infant',title:'유아부',eyebrow:'LITTLE HEARTS, BIG LOVE',description:'하나님의 사랑을 처음 만나는 시간. 찬양하고 이야기하며, 작은 마음에 믿음의 씨앗을 심습니다.',audience:'영유아와 부모님'},
    {id:'children',title:'초등부',eyebrow:'GROWING IN GRACE',description:'말씀 속에서 발견하는 놀라운 기쁨. 친구들과 함께 예배하고 배우며 예수님의 사랑을 알아갑니다.',audience:'어린이'},
    {id:'youth',title:'학생부',aliases:['학생회'],eyebrow:'FAITH FOR TOMORROW',description:'질문하고, 꿈꾸고, 함께 믿는 우리. 말씀 안에서 나를 발견하고 믿음의 친구들과 함께 자라갑니다.',audience:'중학생과 고등학생'},
    {id:'young-adult',title:'청년부',aliases:['청년회'],eyebrow:'LIVING OUR FAITH',description:'청춘의 길 위에서 믿음으로 함께합니다. 삶의 고민을 나누고 세상 속에서 그리스도인으로 살아가는 공동체입니다.',audience:'청년'},
    {id:'adults',title:'신혼부부, 장년부 (각셀)',aliases:['장년부 (각 셀)','장년부 (각셀)','장년부'],eyebrow:'FAITH IN EVERYDAY LIFE',description:'장년부는 각 셀에서 삶을 나누고 말씀과 기도로 함께하는 공동체입니다. 서로의 일상을 돌보며 믿음의 길을 함께 걷습니다.',audience:'장년 성도',image:'./assets/samples/cell-1.jpg',sample:false},
    {id:'caleb',title:'갈렙세대',aliases:['갈랩세대'],eyebrow:'WALKING IN FAITH',description:'삶의 경험과 믿음을 나누며, 서로를 돌보고 함께 기도하는 공동체입니다. 세종하나교회 안에서 믿음과 사랑으로 함께합니다.',audience:'갈렙세대',image:'./assets/samples/cell-7.jpg',sample:false}
  ].map(g=>({meeting:'예배와 모임 시간은 교회에 문의해 주세요.',location:'교회에서 안내해 드립니다.',image:`./assets/samples/${g.id}.jpg`,images:[],sample:true,imageSample:true,...g})),
  videos: [
    {id:'G4mc3skIenA',title:'항상 기뻐하라',date:'2026-10-04',speaker:'위남환 목사',scripture:'빌립보서 4장 4절부터 7절',type:'sermon'},
    {id:'PZNTJbrassM',title:'회개에 합당한 열매',date:'2026-09-06',speaker:'위남환 목사',type:'sermon'},
    {id:'7h2bONSKLOo',title:'네가 복이 있도다',date:'2026-08-30',speaker:'위남환 목사',type:'sermon'}
  ],
  bulletins: [], albums: [], notices: [],
};
