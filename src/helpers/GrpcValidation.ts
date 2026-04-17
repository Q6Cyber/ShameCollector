import { pb, validate, parse } from '@q6cyber/proto2ts';

//
function validatePbModel(obj: any, model: any): boolean {
  // empty objects are automatically invalid but proto2ts is not detecting them.
  if (Object.getOwnPropertyNames(obj).length === 0) {
    return false;
  }
  const checkV = validate(obj, model);
  if (checkV) {
    console.log('GRPC validation return  ==>', checkV);
  }
  return !checkV;
}

export function isPhoneGrpcCompliant(phone) {
  return validatePbModel(phone, pb.collect.PhoneNumberCollect);
}

export function parseJSONPhoneToProto(phone) {
  return parse(phone, pb.collect.PhoneNumberCollect);
}
