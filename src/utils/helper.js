import moment from "moment-timezone";
import { Bless } from "./bless.js";
import logger from "./logger.js";
import { accounts } from "../../accounts/accounts.js";

export class Helper {
  static myCode = "9730e76e-b983-41c0-b583-69fddfd3b714";
  static myCode2 = "waputra";
  static log = new Bless();
  static spinnerContent = (data) => `
${
  accounts instanceof Object
    ? `
Email        : ${data.email}
Points       : ${data.point}`
    : ""
}
User Id      : ${data.id}
Device Id    : ${data.device}
IP           : ${data.ip} (${data.ipScore}%)

Status : ${data.msg}
Delay : ${data.delay}

`;
  static delay = (ms, acc, msg, obj) => {
    return new Promise(async (resolve) => {
      let remainingMilliseconds = ms;

      if (acc != undefined) {
        await this.log.log(msg, acc, obj, `Delaying for ${this.msToTime(ms)}`);
      } else {
        await this.log.info(`Delaying for ${this.msToTime(ms)}`);
      }

      const interval = setInterval(async () => {
        remainingMilliseconds -= 1000;
        if (acc != undefined) {
          await this.log.log(
            msg,
            acc,
            obj,
            `Delaying for ${this.msToTime(remainingMilliseconds)}`
          );
        } else {
          await this.log.info(
            `Delaying for ${this.msToTime(remainingMilliseconds)}`
          );
        }

        if (remainingMilliseconds <= 0) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);

      setTimeout(async () => {
        logger.info(`Worker ${acc} - ${msg}`);
        clearInterval(interval);

        await this.log.clearInfo();

        if (acc) {
          await this.log.log(msg, acc, obj);
        }
        resolve();
      }, ms);
    });
  };

  static readTime(milliseconds) {
    const date = moment.unix(milliseconds);
    return date.format("YYYY-MM-DD HH:mm:ss");
  }

  static getCurrentTimestamp() {
    const timestamp = moment().tz("Asia/Singapore").unix();
    return timestamp.toString();
  }

  static random(min, max) {
    const rand = Math.floor(Math.random() * (max - min + 1)) + min;
    return rand;
  }

  static randomFloat(min, max, fixed = 4) {
    const rand = Math.random() * (max - min) + min;
    return parseFloat(rand.toFixed(fixed));
  }

  static msToTime(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const remainingMillisecondsAfterHours = milliseconds % (1000 * 60 * 60);
    const minutes = Math.floor(remainingMillisecondsAfterHours / (1000 * 60));
    const remainingMillisecondsAfterMinutes =
      remainingMillisecondsAfterHours % (1000 * 60);
    const seconds = Math.round(remainingMillisecondsAfterMinutes / 1000);

    return `${hours} Hours ${minutes} Minutes ${seconds} Seconds`;
  }

  static generateRandomString(length) {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  static serializeBigInt = (obj) => {
    return JSON.parse(
      JSON.stringify(obj, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );
  };

  static isToday(date) {
    const lastCheckInDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastCheckInDateOnly = new Date(lastCheckInDate);
    lastCheckInDateOnly.setHours(0, 0, 0, 0);
    if (lastCheckInDateOnly.getTime() === today.getTime()) {
      return true;
    } else {
      return false;
    }
  }

  static refCheck(currentInviter, currentId) {
    if (currentInviter != this.myCode && !currentId.includes(this.myCode2)) {
      throw Error(
        "Sorry, You cannot use this bot, please join with creator refferal code"
      );
    }
  }

  static showSkelLogo() {
    console.log(`
                                                          
                      ...                                 
                     .;:.                                 
                    .;ol,.                                
                   .;ooc:'                                
            ..    .;ooccc:'.    ..                        
          .',....'cdxlccccc;.....,'.                      
         .;;..'';clolccccccc:,''..;;.                     
        ':c'..':cccccccccccccc;...'c:.                    
       ':cc,.'ccccccccccccccccc:..;cc:'                   
    ...:cc;.':cccccccccccccccccc:..:cc:...                
   .;';cc;.':;;:cccccccccccccc:;;;'.;cc,,;.               
  .cc':c:.',.....;cccccccccc;.....,..:c:'c:               
  ,x:'cc;.,'     .':cccccc:'.     ',.;cc':x'              
  lO,'cc;.;,       .;cccc:.       ,;.;cc';0l              
 .o0;.;c;.,:'......',''''''......':,.;c;.:0l.             
 .lxl,.;,..;c::::;:,.    .,:;::::c;..,;.,oxl.             
 .lkxOl..  ..'..;::'..''..'::;..'..  ..c0xkl.             
  .cKMx.        .;c:;:cc:;:c:.        .xMKc.              
    ;KX:         ;o::l:;cc;o:.        ;KK;                
     :KK:.       ,d,cd,'ol'o:       .:0K:                 
      ;0NOl:;:loo;. ... .. .;ldlc::lkN0:                  
       .lONNNKOx0Xd,;;'.,:,lKKkk0XNN0o.                   
         .','.. .lX0doooodOXd.  .','.                     
                 .,okkddxkd;.                             
                    'oxxd;.                               
   ........................................                              
   .OWo  xNd lox  xxl Ald   xoc dakkkkkxsx.              
   .OWo  o0W cXW  dM0 MMN   lNK laddKMNkso.               
   .kMKoxsNN oWX  dW0 MMMWO lWK    axM0   .                
   .OMWXNaMX dM0  kM0 MMKxNXKW0    axMk   .                 
   .OMk  dWK oWX XWdx Mxx  XMMO    akMx   .                 
   'OWo  dM0 'kNNXNNd DMD   OWk    aoWd   .                 
   ........................................                 
                                                                      
`);
  }
}
