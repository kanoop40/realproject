import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { register } from '../api/register';

const faculties = [
  "บริหารธุรกิจและเทคโนโลยีสารสนเทศ",
  "คณะวิทยาศาสตร์",
  "คณะศิลปศาสตร์",
  "คณะวิศวกรรมศาสตร์",
  "คณะครุศาสตร์อุตสาหกรรม",
  "คณะอื่น ๆ"
];

const majors = [
  "เทคโนโลยีธุรกิจดิจิทัล",
  "การตลาด",
  "การบัญชี",
  "การจัดการ"
];

const groupCodes = [
  "DT26721N",
  "DT26722N",
  "DT26723N"
];

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [faculty, setFaculty] = useState(faculties[0]);
  const [major, setMajor] = useState(majors[0]);
  const [groupCode, setGroupCode] = useState(groupCodes[0]);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validation
  const validate = () => {
    if (!/^\d{1,12}$/.test(username)) {
      setResult('Username ต้องเป็นตัวเลข ไม่เกิน 12 ตัว');
      return false;
    }
    if (password.length < 6) {
      setResult('Password ต้องมีอย่างน้อย 6 ตัวอักษร');
      return false;
    }
    if (!firstName || !lastName) {
      setResult('กรุณากรอกชื่อและนามสกุล');
      return false;
    }
    if (!email) {
      setResult('กรุณากรอกอีเมล');
      return false;
    }
    return true;
  };

  const doRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const res = await register({
        username,
        password,
        email,
        firstName,
        lastName,
        faculty,
        major,
        groupCode
      });
      setResult('✅ สมัครสมาชิกสำเร็จ!');
      setTimeout(() => navigation.navigate('Login'), 1500);
    } catch (e) {
      setResult('❌ สมัครสมาชิกไม่สำเร็จ: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.formBox}>
        <Text style={styles.title}>สมัครสมาชิก</Text>
        <TextInput
          placeholder="รหัสนักศึกษา/พนักงาน (ตัวเลข 12 หลัก)"
          value={username}
          onChangeText={text => setUsername(text.replace(/[^0-9]/g, '').slice(0, 12))}
          keyboardType="number-pad"
          style={styles.input}
        />
        <TextInput
          placeholder="รหัสผ่าน (6 ตัวขึ้นไป)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          placeholder="อีเมล"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          placeholder="ชื่อ"
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
        />
        <TextInput
          placeholder="นามสกุล"
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
        />

        <Text style={styles.label}>คณะ</Text>
        <Picker
          selectedValue={faculty}
          onValueChange={setFaculty}
          style={styles.picker}
        >
          {faculties.map(f => <Picker.Item key={f} label={f} value={f} />)}
        </Picker>

        <Text style={styles.label}>สาขาวิชา</Text>
        <Picker
          selectedValue={major}
          onValueChange={setMajor}
          style={styles.picker}
        >
          {majors.map(m => <Picker.Item key={m} label={m} value={m} />)}
        </Picker>

        <Text style={styles.label}>รหัสกลุ่มเรียน</Text>
        <Picker
          selectedValue={groupCode}
          onValueChange={setGroupCode}
          style={styles.picker}
        >
          {groupCodes.map(g => <Picker.Item key={g} label={g} value={g} />)}
        </Picker>

        <Text style={styles.result}>{result}</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.regisButton]}
            onPress={doRegister}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>ย้อนกลับ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  formBox: {
    width: '90%',
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 22,
    elevation: 6,
    shadowColor: '#2196f3',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 16,
    alignSelf: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#90caf9',
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 10,
    fontSize: 16,
  },
  label: {
    marginTop: 8,
    marginBottom: 2,
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 15,
  },
  picker: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginBottom: 12,
  },
  result: {
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
    marginTop: 8,
  },
  regisButton: {
    backgroundColor: '#43a047',
  },
  backButton: {
    backgroundColor: '#1976d2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  }
});

export default RegisterScreen;