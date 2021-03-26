const NS_PER_SEC = 1e9

import { Utils } from 'sequelize/types';
import * as Context from '../p2p/Context'
import * as utils from '../utils'
import { nestedCountersInstance } from '../utils/nestedCounters'
// process.hrtime.bigint()

interface Profiler {
  sectionTimes: any
  // instance: Profiler
}

export interface NodeLoad {
  internal: number
  external: number
}

export let profilerInstance: Profiler
class Profiler {
  sectionTimes: any;
  eventCounters: Map<string, Map<string,number>>;
  stackHeight: number;

  constructor() {
    this.sectionTimes = {}
    this.eventCounters = new Map()
    this.stackHeight = 0
    profilerInstance = this

    this.profileSectionStart('_total', true)
    this.profileSectionStart('_internal_total', true)
  }

  registerEndpoints (){
    Context.network.registerExternalGet('perf', (req, res) => {
      let result = this.printAndClearReport(1)
      //res.json({result })

      res.write(result)
      res.end()
    })
  }

  profileSectionStart(sectionName, internal = false) {
    let section = this.sectionTimes[sectionName]

    if (section != null && section.started === true) {

      nestedCountersInstance.countEvent('profiler-start-error', sectionName)
      return
    }

    if (section == null) {
      let t = BigInt(0)
      section = { name: sectionName, total: t, c: 0, internal }
      this.sectionTimes[sectionName] = section
    }

    section.start = process.hrtime.bigint()
    section.started = true
    section.c++

    if(internal === false){
      nestedCountersInstance.countEvent('profiler', sectionName)

      this.stackHeight++
      if(this.stackHeight === 1){
        this.profileSectionStart('_totalBusy', true)
        this.profileSectionStart('_internal_totalBusy', true)
      }      
    }
  }

  profileSectionEnd(sectionName, internal = false) {
    let section = this.sectionTimes[sectionName]
    if (section == null || section.started === false) {

      nestedCountersInstance.countEvent('profiler-end-error', sectionName)
      return
    }

    section.end = process.hrtime.bigint()

    section.total += section.end - section.start
    section.started = false

    if(internal === false){
      nestedCountersInstance.countEvent('profiler-end', sectionName)

      this.stackHeight--
      if(this.stackHeight === 0){
        this.profileSectionEnd('_totalBusy', true)
        this.profileSectionEnd('_internal_totalBusy', true)
      }  
    }
  }

  cleanInt(x) {
    x = Number(x)
    return x >= 0 ? Math.floor(x) : Math.ceil(x)
  }

  getTotalBusyInternal() : Number {
    nestedCountersInstance.countEvent('profiler-note', 'getTotalBusyInternal')

    this.profileSectionEnd('_internal_total', true)
    let internalTotalBusy = this.sectionTimes['_internal_totalBusy']
    let internalTotal = this.sectionTimes['_internal_total']
    let duty = BigInt(0)
    if(internalTotalBusy != null && internalTotal != null ) {
      if(internalTotal.total > BigInt(0)){
        duty = (BigInt(100) * internalTotalBusy.total) / internalTotal.total
      }
    }
    this.profileSectionStart('_internal_total', true)

    //clear these timers
    internalTotal.total = BigInt(0)
    internalTotalBusy.total = BigInt(0)

    return Number(duty) * 0.01
  }

  getNodeLoad() : NodeLoad {
    nestedCountersInstance.countEvent('profiler-note', 'getTotalBusyInternal')

    this.profileSectionEnd('_total', true)

    let netInternalSection = this.sectionTimes['net-internl']
    let netExternalSection = this.sectionTimes['net-externl']
    let total = this.sectionTimes['_total']
    
    if (!netInternalSection || !netExternalSection) return { internal: 0, external: 0 }

    let d1 = this.cleanInt(1e6) // will get us ms
    let divider = BigInt(d1)
    let internalDuty = BigInt(0)
    let externalDuty = BigInt(0)

    //if (netInternalSection) console.log("netInternalSection", netInternalSection, netInternalSection.total / divider)
    //if (netExternalSection) console.log("netExternalSection", netExternalSection, netExternalSection.total / divider)
    //if (total) console.log("total", total, total.total / divider)

    if(netInternalSection != null && total != null ) {
      if(total.total > BigInt(0)) {
        internalDuty = (BigInt(100) * netInternalSection.total) / total.total
      }
    }

    if(netExternalSection != null && total != null ) {
      if(total.total > BigInt(0)) {
        externalDuty = (BigInt(100) * netExternalSection.total) / total.total
      }
    }
    this.profileSectionStart('_total', true)

    total.total = BigInt(0)
    netInternalSection.total = BigInt(0)
    netExternalSection.total = BigInt(0)

    return {
      internal: Number(internalDuty) * 0.01,
      external: Number(externalDuty) * 0.01
    }
  }

  clearTimes(){
    for (let key in this.sectionTimes) {
      if(key === '_internal_total' || key === '_internal_totalBusy')
      {
        continue
      }

      if (this.sectionTimes.hasOwnProperty(key)) {
        let section = this.sectionTimes[key]
        section.total = BigInt(0)
      }
    }
  }

  printAndClearReport(delta?: number) : string {
    this.profileSectionEnd('_total', true)

    let result = 'Profile Sections:\n'
    let d1 = this.cleanInt(1e6) // will get us ms
    let divider = BigInt(d1)

    let totalSection = this.sectionTimes['_total']
    let totalBusySection = this.sectionTimes['_totalBusy']
    console.log("totalSection from printAndClearReport", totalSection)

    let lines = []
    for (let key in this.sectionTimes) {
      if(key === '_internal_total' || key === '_internal_totalBusy')
      {
        continue
      }

      if (this.sectionTimes.hasOwnProperty(key)) {
        let section = this.sectionTimes[key]
        
        // result += `${section.name}: total ${section.total /
        //   divider} avg:${section.total / (divider * BigInt(section.c))} ,  ` // ${section.total} :

        let duty = BigInt(0)
        if(totalSection.total > BigInt(0)){
          duty = (BigInt(100) * section.total) / totalSection.total
        }
        let totalMs = section.total / divider
        let dutyStr = `${duty}`.padStart(4)
        let totalStr = `${totalMs}`.padStart(13)
        let line = `${dutyStr}% ${section.name.padEnd(30)}, ${totalStr}ms, #:${section.c}`
        //section.total = BigInt(0)

        lines.push({line, totalMs})
      }
    }

    lines.sort((l1,l2) =>  Number(l2.totalMs - l1.totalMs))

    result = result + lines.map((line)=> line.line).join('\n')

    this.clearTimes()

    this.profileSectionStart('_total', true)
    return result
  }


}



export default Profiler
