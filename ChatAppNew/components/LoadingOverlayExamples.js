// ตัวอย่างการใช้งาน LoadingOverlay Component

// 1. การใช้งานพื้นฐาน
import LoadingOverlay from '../components/LoadingOverlay';

const MyScreen = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <LoadingOverlay visible={isLoading} />
      {/* เนื้อหาหน้าจออื่นๆ */}
    </View>
  );
};

// 2. การปรับแต่งข้อความ
<LoadingOverlay 
  visible={isLoading} 
  message="กำลังอัพโหลดรูปภาพ..." 
/>

// 3. การปรับขนาด Animation
<LoadingOverlay 
  visible={isLoading} 
  message="กำลังส่งข้อความ..." 
  animationSize={60}
/>

// 4. การปรับสี Background
<LoadingOverlay 
  visible={isLoading} 
  message="กำลังโหลดข้อมูล..." 
  backgroundColor="rgba(255,255,255,0.8)"
/>

// 5. การใช้ในหน้าอื่นๆ
// - ส่งข้อความ: "กำลังส่งข้อความ..."
// - อัพโหลดไฟล์: "กำลังอัพโหลดไฟล์..."
// - สร้างกลุ่ม: "กำลังสร้างกลุ่ม..."
// - โหลดข้อมูล: "กำลังโหลดข้อมูล..."