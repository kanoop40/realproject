const { protect } = require('./Middleware/authMiddleware');
const { checkRole } = require('./Middleware/roleMiddleware');

console.log('protect:', typeof protect);
console.log('checkRole:', typeof checkRole);
console.log('checkRole result:', typeof checkRole('admin'));

if (typeof protect === 'function') {
  console.log('✅ protect is a function');
} else {
  console.log('❌ protect is not a function');
}

if (typeof checkRole === 'function') {
  console.log('✅ checkRole is a function');
} else {
  console.log('❌ checkRole is not a function');
}

const roleMiddleware = checkRole('admin');
if (typeof roleMiddleware === 'function') {
  console.log('✅ checkRole("admin") returns a function');
} else {
  console.log('❌ checkRole("admin") does not return a function, got:', typeof roleMiddleware);
}