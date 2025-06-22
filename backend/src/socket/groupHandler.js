const groupHandler = (io, socket) => {
  // เข้าร่วมห้องของกลุ่ม
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
  });

  // แจ้งเตือนเมื่อมีสมาชิกใหม่เข้ากลุ่ม
  socket.on('member_added', (data) => {
    io.to(`group_${data.groupId}`).emit('new_member', {
      groupId: data.groupId,
      newMembers: data.newMembers
    });
  });

  // แจ้งเตือนเมื่อมีสมาชิกออกจากกลุ่ม
  socket.on('member_removed', (data) => {
    io.to(`group_${data.groupId}`).emit('member_left', {
      groupId: data.groupId,
      removedMembers: data.removedMembers
    });
  });
};

module.exports = groupHandler;