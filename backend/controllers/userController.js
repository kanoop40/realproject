const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
   console.log('Found user:', user); // เพิ่ม log นี้
    // Check password
    if (user && (await user.matchPassword(password))) {
        // สร้าง token ใหม่โดยใช้ _id
        const token = generateToken(user._id);
        console.log('Generated token:', token); // เพื่อตรวจสอบ token
 console.log('User ID:', user._id); // เพิ่ม log นี้
        console.log('Generated token:', token); // เพิ่ม log นี้
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token: token // ส่ง token กลับไป
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

const registerUser = asyncHandler(async (req, res) => {
    const { 
        username, 
        email, 
        password, 
        firstName, 
        lastName,
        faculty,
        major,
        groupCode 
    } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({
        username,
        email,
        password,
        firstName,
        lastName,
        faculty,
        major,
        groupCode
    });

    if (user) {
        // สร้าง token ใหม่โดยใช้ _id
        const token = generateToken(user._id);
        console.log('Generated token:', token); // เพื่อตรวจสอบ token

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            token: token // ส่ง token กลับไป
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});