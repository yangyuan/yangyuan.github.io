
function prependTranslation(param1, param2)
{
	var v1 = mat4.create();
	mat4.copy(v1, param1)
	v1[3] = v1[3] + (param2[0] * v1[0] + param2[1] * v1[1] + param2[2] * v1[2]);
	v1[7] = v1[7] + (param2[0] * v1[4] + param2[1] * v1[5] + param2[2] * v1[6]);
	v1[11] = v1[11] + (param2[0] * v1[8] + param2[1] * v1[9] + param2[2] * v1[10]);
	v1[15] = v1[15] + (param2[0] * v1[12] + param2[1] * v1[13] + param2[2] * v1[14]);
	return v1;
}// end function

function fromModelVector(param1, param2)
{
	var _temp_3 = param2[0] * 2;
	var _temp_4 = param2[1] * 2;
	var _temp_5 = param2[2] * 2;
	var _temp_6 = param2[3] * _temp_3;
	var _temp_7 = param2[3] * _temp_4;
	var _temp_8 = param2[3] * _temp_5;
	var _temp_9 = param2[0] * _temp_3;
	var _temp_10 = param2[0] * _temp_4;
	var _temp_11 = param2[0] * _temp_5;
	var _temp_12 = param2[1] * _temp_4;
	var _temp_13 = param2[1] * _temp_5;
	var _temp_14 = param2[2] * _temp_5;
	param1[0] = 1 - (_temp_12 + _temp_14);
	param1[1] = _temp_10 - _temp_8;
	param1[2] = _temp_11 + _temp_7;
	param1[3] = 0;
	param1[4] = _temp_10 + _temp_8;
	param1[5] = 1 - (_temp_9 + _temp_14);
	param1[6] = _temp_13 - _temp_6;
	param1[7] = 0;
	param1[8] = _temp_11 - _temp_7;
	param1[9] = _temp_13 + _temp_6;
	param1[10] = 1 - (_temp_9 + _temp_12);
	param1[11] = 0;
	param1[12] = 0;
	param1[13] = 0;
	param1[14] = 0;
	param1[15] = 1;
	return param1;
}// end function

function multiply(v1, v2)
{
	var v3 = mat4.create();

	v3[0] = v1[0] * v2[0] + v1[1] * v2[4] + v1[2] * v2[8] + v1[3] * v2[12];
	v3[1] = v1[0] * v2[1] + v1[1] * v2[5] + v1[2] * v2[9] + v1[3] * v2[13];
	v3[2] = v1[0] * v2[2] + v1[1] * v2[6] + v1[2] * v2[10] + v1[3] * v2[14];
	v3[3] = v1[0] * v2[3] + v1[1] * v2[7] + v1[2] * v2[11] + v1[3] * v2[15];
	v3[4] = v1[4] * v2[0] + v1[5] * v2[4] + v1[6] * v2[8] + v1[7] * v2[12];
	v3[5] = v1[4] * v2[1] + v1[5] * v2[5] + v1[6] * v2[9] + v1[7] * v2[13];
	v3[6] = v1[4] * v2[2] + v1[5] * v2[6] + v1[6] * v2[10] + v1[7] * v2[14];
	v3[7] = v1[4] * v2[3] + v1[5] * v2[7] + v1[6] * v2[11] + v1[7] * v2[15];
	v3[8] = v1[8] * v2[0] + v1[9] * v2[4] + v1[10] * v2[8] + v1[11] * v2[12];
	v3[9] = v1[8] * v2[1] + v1[9] * v2[5] + v1[10] * v2[9] + v1[11] * v2[13];
	v3[10] = v1[8] * v2[2] + v1[9] * v2[6] + v1[10] * v2[10] + v1[11] * v2[14];
	v3[11] = v1[8] * v2[3] + v1[9] * v2[7] + v1[10] * v2[11] + v1[11] * v2[15];
	v3[12] = v1[12] * v2[0] + v1[13] * v2[4] + v1[14] * v2[8] + v1[15] * v2[12];
	v3[13] = v1[12] * v2[1] + v1[13] * v2[5] + v1[14] * v2[9] + v1[15] * v2[13];
	v3[14] = v1[12] * v2[2] + v1[13] * v2[6] + v1[14] * v2[10] + v1[15] * v2[14];
	v3[15] = v1[12] * v2[3] + v1[13] * v2[7] + v1[14] * v2[11] + v1[15] * v2[15];

	return v3;
}// end function