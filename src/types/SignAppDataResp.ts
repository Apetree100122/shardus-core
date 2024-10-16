import { VectorBufferStream } from '../utils/serialization/VectorBufferStream'
import { verifyPayload } from './ajv/Helpers'
import { AJVSchemaEnum } from './enum/AJVSchemaEnum'
import { TypeIdentifierEnum } from './enum/TypeIdentifierEnum'

export const cSignAppDataRespVersion = 1

export type SignAppDataResp = {
  success: boolean
  signature: {
    owner: string
    sig: string
  }
}

export function serializeSignAppDataResp(
  stream: VectorBufferStream,
  obj: SignAppDataResp,
  root = false
): void {
  if (root) {
    stream.writeUInt16(TypeIdentifierEnum.cSignAppDataResp)
  }
  stream.writeUInt8(cSignAppDataRespVersion)
  stream.writeUInt8(obj.success ? 1 : 0)
  stream.writeString(obj.signature.owner)
  stream.writeString(obj.signature.sig)
}

export function deserializeSignAppDataResp(stream: VectorBufferStream): SignAppDataResp {
  const version = stream.readUInt8()
  if (version > cSignAppDataRespVersion) {
    throw new Error(`SignAppDataResp version mismatch, version: ${version}`)
  }
  const result = {
    success: stream.readUInt8() === 1,
    signature: {
      owner: stream.readString(),
      sig: stream.readString(),
    },
  }
  const errors = verifyPayload(AJVSchemaEnum.SignAppDataResp, result)
  if (errors && errors.length > 0) {
    throw new Error('Data validation error')
  }
  return result
}
