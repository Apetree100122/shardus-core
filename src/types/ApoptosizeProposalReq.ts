import { VectorBufferStream } from '../utils/serialization/VectorBufferStream'

const cApoptosisProposalReq = 1
const cApoptosisProposalReqVersion = 1

export interface ApoptosisProposalReq {
  id: string
  when: number
}

export function serializeApoptosisProposalReq(
  stream: VectorBufferStream,
  obj: ApoptosisProposalReq,
  root = false
): void {
  if (root) {
    stream.writeUInt16(cApoptosisProposalReq)
  }
  stream.writeUInt16(cApoptosisProposalReqVersion)
  stream.writeString(obj.id)
  stream.writeUInt32(obj.when)
}

export function deserializeApoptosisProposalReq(stream: VectorBufferStream): ApoptosisProposalReq {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const version = stream.readUInt16()
  const id = stream.readString()
  const when = stream.readUInt32()

  const obj: ApoptosisProposalReq = {
    id,
    when,
  }

  return obj
}
