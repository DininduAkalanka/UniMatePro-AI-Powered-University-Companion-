// Professional illustrations for UniMate app - Using local assets

export const ILLUSTRATIONS = {
  // Login & Auth
  login: require('../assets/images/unimateImage/college entrance exam-pana.svg'),
  signup: require('../assets/images/unimateImage/college class-pana.svg'),
  
  // Dashboard & Home
  dashboard: require('../assets/images/unimateImage/college campus-amico.svg'),
  emptyState: require('../assets/images/unimateImage/undraw_ideas-flow_lwpa.svg'),
  welcome: require('../assets/images/unimateImage/college class-pana (1).svg'),
  
  // Tasks
  taskComplete: require('../assets/images/unimateImage/Completed-amico.svg'),
  taskPending: require('../assets/images/unimateImage/Task-pana.svg'),
  addTask: require('../assets/images/unimateImage/undraw_to-do-app_esjl.svg'),
  taskSchedule: require('../assets/images/unimateImage/tasksshedule.jpg'),
  kanban: require('../assets/images/unimateImage/kanban method-amico.svg'),
  
  // Courses
  courses: require('../assets/images/unimateImage/college project-pana.svg'),
  addCourse: require('../assets/images/unimateImage/college project-rafiki.svg'),
  emptyCourses: require('../assets/images/unimateImage/undraw_sharing-knowledge_2jx3.svg'),
  courseFlat: require('../assets/images/unimateImage/college project Flat Illustrations.png'),
  
  // Study & Learning
  study: require('../assets/images/unimateImage/undraw_spreadsheets_bh6n.svg'),
  office: require('../assets/images/unimateImage/Office management-pana.svg'),
  
  // Planner & Calendar
  planner: require('../assets/images/unimateImage/Calendar-amico.svg'),
  schedule: require('../assets/images/unimateImage/Online calendar-pana.svg'),
  
  // AI & Chat
  aiChat: require('../assets/images/unimateImage/Chat bot-pana.svg'),
  
  // Success & Achievement
  success: require('../assets/images/unimateImage/complete.png'),
  completed: require('../assets/images/unimateImage/Completed-amico.svg'),
  
  // Background Photos (for hero sections)
  heroStudy1: require('../assets/images/unimateImage/ben-duchac-96DW4Pow3qI-unsplash.jpg'),
  heroStudy2: require('../assets/images/unimateImage/kenny-eliason-1-aA2Fadydc-unsplash.jpg'),
  heroStudy3: require('../assets/images/unimateImage/pang-yuhao-_kd5cxwZOK4-unsplash.jpg'),
  heroStudy4: require('../assets/images/unimateImage/rut-miit-3X5ExRgNt3M-unsplash.jpg'),
  heroStudy5: require('../assets/images/unimateImage/thought-catalog-505eectW54k-unsplash.jpg'),
  heroStudy6: require('../assets/images/unimateImage/wes-hicks-4-EeTnaC1S4-unsplash.jpg'),
  heroStudy7: require('../assets/images/unimateImage/evan-mach-bv0Qs8eh1I0-unsplash.jpg'),
};

// Helper function to get random hero image
export const getRandomHeroImage = () => {
  const heroImages = [
    ILLUSTRATIONS.heroStudy1,
    ILLUSTRATIONS.heroStudy2,
    ILLUSTRATIONS.heroStudy3,
    ILLUSTRATIONS.heroStudy4,
    ILLUSTRATIONS.heroStudy5,
    ILLUSTRATIONS.heroStudy6,
    ILLUSTRATIONS.heroStudy7,
  ];
  return heroImages[Math.floor(Math.random() * heroImages.length)];
};
