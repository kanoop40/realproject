module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // ลบบรรทัด 'plugins' ข้างล่างนี้ออกไปได้เลยถ้าไม่มีปลั๊กอินอื่น
    // plugins: ['nativewind/babel'] <--- ลบบรรทัดนี้
  };
};