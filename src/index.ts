import XRegExp, { ExecArray } from 'xregexp';
import { RRule, RRuleSet } from 'rrule';
import { rrulestr } from 'rrule';
import moment from 'moment';

export const recurrent4js = (name: string): string => "Hello, " + name + "!";

// Helper function to work like python's re.match.
function xRegExactMatch(input: string, pattern: RegExp): RegExpExecArray | null {
  const match = XRegExp.exec(input, pattern);
  return match !== null && match[0].length === input.length ? match : null;
}

// Helper to replace python's calendar.month_abbr.
const monthAbbr = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DoWs = [
  'mon(day)?',
  'tues?(day)?',
  '(we(dnes|nds|ns|des)day)|(wed)',
  '(th(urs|ers)day)|(thur?s?)',
  'fri(day)?',
  'sat([ue]rday)?',
  'sun(day)?',
  'weekday',
  'weekend'
];
const RE_DOWS = DoWs.map(s => XRegExp(s));
const STR_RE_PLURAL_DOW = 'mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays';
const RE_PLURAL_DOW = XRegExp(STR_RE_PLURAL_DOW);
const STR_RE_DOW = '(' + DoWs.join(')|(') + ')';
const RE_DOW = XRegExp(STR_RE_DOW);
const STR_RE_PLURAL_WEEKDAY = 'weekdays|weekends|' + STR_RE_PLURAL_DOW;
const RE_PLURAL_WEEKDAY = XRegExp(STR_RE_PLURAL_WEEKDAY);
const weekday_codes = [ 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU', 'MO,TU,WE,TH,FR',
  'SA,SU'];
const ordered_weekday_codes = ['', 'SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const next_day = {'MO': 'TU', 'TU': 'WE', 'WE': 'TH', 'TH': 'FR', 'FR': 'SA',
  'SA': 'SU', 'SU': 'MO'};
const day_names = {'MO': 'Mon', 'TU': 'Tue', 'WE': 'Wed', 'TH': 'Thu', 'FR': 'Fri',
  'SA': 'Sat', 'SU': 'Sun'};
const plural_day_names = {
  'MO': 'Mondays',
  'TU': 'Tuesdays',
  'WE': 'Wednesdays',
  'TH': 'Thursdays',
  'FR': 'Fridays',
  'SA': 'Saturdays',
  'SU': 'Sundays'
};

const MoYs = [
    'jan(uary)?',
    'feb(r?uary)?',
    'mar(ch)?',
    'apr(il)?',
    'may',
    'jun(e)?',
    'jul(y)?',
    'aug(ust)?',
    'sept?(ember)?',
    'oct(ober)?',
    'nov(ember)?',
    'dec(ember)?',
];
const RE_MOYS = MoYs.map(s => XRegExp(s + '$'));
const RE_MOY = XRegExp('(' + MoYs.join(')$|(') + ')$');
const STR_RE_MOY_NOT_ANCHORED = '(' + MoYs.join(')|(') + ')';
const RE_MOY_NOT_ANCHORED = XRegExp(STR_RE_MOY_NOT_ANCHORED);

const units = ['day', 'week', 'month', 'year', 'hour', 'minute', 'min', 'sec', 'seconds'];
const units_freq = ['daily', 'weekly', 'monthly', 'yearly', 'hourly', 'minutely', 'minutely',
  'secondly', 'secondly'];
const RE_UNITS = XRegExp('^(' + units.join('s?|') + '?)$');

const ordinals = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'last',
];
const RE_ORDINALS = ordinals.map(s => XRegExp(s + '$'));
const RE_ORDINAL = XRegExp('\\d+(st|nd|rd|th)$|' + ordinals.join('$|'));
const STR_RE_ORDINAL_NOT_ANCHORED = '\\d+(st|nd|rd|th)|' + ordinals.join('|');
const RE_ORDINAL_NOT_ANCHORED = XRegExp(STR_RE_ORDINAL_NOT_ANCHORED);
const numbers = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];
const RE_NUMBERS = numbers.map(s => XRegExp(s + '$'));
const RE_NUMBER = XRegExp('(' + numbers.join('|') + ')$|(\\d+)$');
const STR_RE_NUMBER_NOT_ANCHORED = '(' + numbers.join('|') + ')|(\\d+)';
const RE_NUMBER_NOT_ANCHORED = XRegExp(STR_RE_NUMBER_NOT_ANCHORED);

const RE_EVERY = XRegExp('(every|each|once)$');
const RE_THROUGH = XRegExp('(through|thru)$');

const STR_RE_DAILY = 'daily|everyday';
const RE_DAILY = XRegExp(STR_RE_DAILY);
const RE_RECURRING_UNIT = XRegExp('weekly|monthly|yearly');

function get_number(s: string): number {
  let result = parseInt(s);
  if (isNaN(result)) {
    result = numbers.indexOf(s);
    if (result == -1) {
      throw new Error('ValueError');
    }
  }

  return result;
}

function get_ordinal_index(s: string): number {
  let result: number = parseInt(s.slice(0, -2));
  if (isNaN(result)) {
    const sign: number = s[0] === '-' ? -1 : 1
    for (let i: number = 0; i < RE_ORDINALS.length; i++) {
      const reg: RegExp = RE_ORDINALS[i];
      if (s.match(reg)) {
        result = i === 10 ? -1 : sign * (i + 1);
        break;
      }
    }
  }
  if (isNaN(result)) {
    throw new Error('ValueError');
  }
  return result;
}

function get_DoW(s: string): string[] {
  let result: string[] = [];
  for (let i: number = 0; i < RE_DOWS.length; i++) {
    const dow: RegExp = RE_DOWS[i];
    if (dow.test(s)) {
      result = weekday_codes[i].split(',');
      break;
    }
  }
  if (result.length === 0) {
    throw new Error('ValueError');
  }
  return result;
}

function get_MoY(s: string): number {
  let result: number = -1;
  for (let i: number = 0; i < RE_MOYS.length; i++) {
    const moy = RE_MOYS[i];
    if (moy.test(s)) {
      result = i + 1;
      break;
    }
  }
  if (result === -1) {
    throw new Error('ValueError');
  }
  return result;
}

function get_unit_freq(s: string): string {
  let result: string = '';
  for (let i: number = 0; i < units.length; i++) {
    const unit = units[i];
    if (s.includes(unit)) {
      result = units_freq[i];
      break;
    }
  }
  if (result === '') {
    throw new Error('ValueError');
  }
  return result;
}

const STR_RE_TIME = '(?<hour>\\d{1,2}):?(?<minute>\\d{2})?\\s?(?<mod>am?|pm?)?(o\'?clock)?';
const RE_TIME = XRegExp(STR_RE_TIME);
const RE_DEF_TIME = XRegExp('[:apo]');
const RE_AT_TIME = XRegExp(`at\\s${STR_RE_TIME}`);
const RE_AT_TIME_END = XRegExp(`at\\s${STR_RE_TIME}$`);
const STR_RE_STARTING = 'start(?:s|ing)?';
const RE_STARTING = XRegExp(STR_RE_STARTING);
const STR_RE_ENDING = '(?:\\bend|until)(?:s|ing)?';
const RE_ENDING = XRegExp(STR_RE_ENDING);
const RE_REPEAT = XRegExp('(?:every|each|\\bon\\b|repeat(s|ing)?)');
const STR_RE_START = `(${STR_RE_STARTING})\\s(?P<starting>.*)`
const RE_START = XRegExp(STR_RE_START);
const STR_RE_START_SHORT = (`(${STR_RE_STARTING})\\s(?P<starting>.*?)`)
const RE_START_SHORT = XRegExp(STR_RE_START_SHORT);
const STR_RE_EVENT = `(?P<event>(?:every|each|\\bon\\b|\\bthe\\b|repeat|${STR_RE_DAILY}|${STR_RE_PLURAL_WEEKDAY}|${STR_RE_ORDINAL_NOT_ANCHORED})(?:s|ing)?(.*))`;
const RE_EVENT = XRegExp(STR_RE_EVENT);
const STR_RE_EVENT_NO_ORD = `(?P<event>(?:every|each|\\bon\\b|\\bthe\\b|repeat|${STR_RE_DAILY}|${STR_RE_PLURAL_WEEKDAY})(?:s|ing)?(.*))`;
const RE_EVENT_NO_ORD = XRegExp(STR_RE_EVENT_NO_ORD);
const STR_RE_END = `${STR_RE_ENDING}(?P<ending>.*)`;
const RE_END = XRegExp(STR_RE_END);
const RE_START_EVENT = XRegExp(`${STR_RE_START_SHORT}\\s${STR_RE_EVENT_NO_ORD}`);
const RE_EVENT_START = XRegExp(`${STR_RE_EVENT}\\s${STR_RE_START}`);
const RE_FROM_TO = XRegExp(`(?P<event>.*)from(?P<starting>.*)(to|through|thru|until)(?P<ending>.*)`);
const RE_COUNT = XRegExp(
  `(?P<event>.*?)(?:\\bfor\\s+|\\b(?:for\\s+)?up\\s+to\\s+)?(?:(?P<twice>twice)|(?P<count>${STR_RE_NUMBER_NOT_ANCHORED})(?:x|\\s*times|\\s*occurrences))`
);
const RE_COUNT_UNTIL1 = XRegExp(`(?P<event>.*?)(?:\\bfor\\s+the\\s+next\\s+|\\bfor\\s+(?:up\\s+to\\s+)?)\\s*(?P<unit>week|month|year)`);
const RE_COUNT_UNTIL = XRegExp(
  `(?P<event>.*?)(?:\\bfor\\s+the\\s+next\\s+|\\bfor\\s+(?:up\\s+to\\s+)?)(?P<count>${STR_RE_NUMBER_NOT_ANCHORED})\\s*(?P<unit>weeks|months|years)`
);
const RE_START_END = XRegExp(`${STR_RE_START}\\s${STR_RE_END}`);
const RE_OTHER_END = XRegExp(`(?P<other>.*)\\s${STR_RE_END}`);
const RE_SEP = XRegExp('(from|to|through|thru|on|at|of|in|a|an|the|and|or|both)$');
const RE_AMBIGMOD = XRegExp('(this|next|last)$');
const RE_OTHER = XRegExp('other|alternate');
const RE_AMPM = XRegExp('am?|pm?|o\'?clock');
const RE_LONG_DATE_START = XRegExp(`(${STR_RE_DOW}),\\s*(${STR_RE_MOY_NOT_ANCHORED})`);
const RE_EXCEPT = XRegExp('(?P<event>.*?)\\bexcept(?:\\s+for\\s|\\s+on\\s+|\\s+in\\s+)?(?P<except>.*)$');
const RE_YEAR = XRegExp('\\b(\\d\\d\\d\\d)\\b');
const RE_ORD_DAY_WEEK_MONTH_OR_YEAR = XRegExp(
  `(?P<ord>${STR_RE_ORDINAL_NOT_ANCHORED})\\s+(?P<unit>(?:${STR_RE_DOW}|day|week|month|year)\\b)`
);
const RE_THRU = XRegExp(
  `(?P<first>${STR_RE_PLURAL_DOW}|${STR_RE_DOW})(?:[-]|\\s+thru\\s+|\\s+through\\s+)(?P<second>${STR_RE_PLURAL_DOW}|${STR_RE_DOW})`
);
const RE_BEGIN_END_OF = XRegExp('(?P<be>beginning|begin|start|ending|end)\\s+of\\b');
const RE_AT_BEGIN_END = XRegExp(`\\bat(\\s+the)?\\s+(?P<be>beginning\\b|begin\\b|start\\b|ending\\b|end\\b)`);
const RE_RRULE = XRegExp('^RRULE:(?P<rr>.*)$', 'm');
const RE_BYSETPOS = XRegExp('\\binstance\\b|\\boccurrence\\b');

function normalize(s: string): string {
  let normalized = s.trim().toLowerCase();

  normalized = XRegExp.replace(normalized, XRegExp(',\\s*(\\d{4})'), ' $1'); // Remove commas in dates before the year
  normalized = XRegExp.replace(normalized, XRegExp(RE_LONG_DATE_START), '$1 $2'); // Remove commas in long format dates, e.g. "Tuesday, January..."
  normalized = XRegExp.replace(normalized, XRegExp(',\\s*and'), ' and'); // Remove commas before 'and'
  normalized = XRegExp.replace(normalized, XRegExp(','), ' and '); // Change all other commas to ' and '
  normalized = XRegExp.replace(normalized, XRegExp('[^\\w\\s\\./:-]'), ''); // Allow . for international formatting
  normalized = XRegExp.replace(normalized, XRegExp('\\s+'), ' ');

  return normalized;
}

function handleBeginEnd(s: string): string {
  // TODO : Determine correct type for m.
  const subBe1 = (m: any): string => {
    if (m[1].startsWith('e')) {
      return 'last of';
    } else {
      return 'first of';
    }
  };

  const subBe2 = (m: any): string => {
    if (m[1].startsWith('e')) {
      return 'on the last';
    } else {
      return 'on the first';
    }
  };

  s = XRegExp.replace(s, XRegExp(RE_BEGIN_END_OF), subBe1);
  s = XRegExp.replace(s, XRegExp(RE_AT_BEGIN_END), subBe2);

  return s;
}

class Token {
  text: string;
  all_text: string;
  type_: string | null;

  constructor(text: string, all_text: string, type_: string | null) {
    this.text = text;
    this.all_text = all_text;
    this.type_ = type_;
  }

  toString(): string {
    return `<Token ${this.text}: ${this.type_}>`;
  }
}

class Tokenizer {
  static CONTENT_TYPES: Array<[string, RegExp]> = [
    ['daily', RE_DAILY],
    ['every', RE_EVERY],
    ['through', RE_THROUGH],
    ['recurring_unit', RE_RECURRING_UNIT],
    ['ordinal', RE_ORDINAL],
    ['unit', RE_UNITS],
    ['number', RE_NUMBER],
    ['plural_weekday', RE_PLURAL_WEEKDAY],
    ['DoW', RE_DOW],
    ['MoY', RE_MOY],
    ['instances', RE_BYSETPOS]
  ];

  static TYPES: Array<[string, RegExp]> = [
    ...this.CONTENT_TYPES,
    ['ambigmod', RE_AMBIGMOD],
    ['starting', RE_STARTING],
    ['ending', RE_ENDING],
    ['repeat', RE_REPEAT],
    ['sep', RE_SEP],
    ['time', RE_TIME],
    ['other', RE_OTHER],
    ['ampm', RE_AMPM]
  ];

  tokens: Token[] = [];
  text: string;
  private _index: number;
  all_: Token[] = [];

  constructor(text: string) {
    this.text = text;
    this._index = 0;
    this.all_ = [];
    const s = this.text;

    for (const token of s.split(' ')) {
      let matched = false;
      for (const [type_, regex] of Tokenizer.TYPES) {
        const m = XRegExp.exec(token, regex);
        if (m) {
          const tok = new Token(token, s, type_);
          this.tokens.push(tok);
          this.all_.push(tok);
          matched = true;
          break;
        }
      }
      if (!matched) {
        this.all_.push(new Token(token, s, null));
      }
    }

    // log.debug(`tokenized '${this.text}'\n${this}`);
  }

  toString(): string {
    return this.tokens.map((token) => token.toString()).join('\n');
  }
}

class RecurringEvent {
  now_date: Date;
  preferred_time_range: [number, number];
  private dtstart: Date | null = null;
  private until: Date | null = null;
  private count: number | null = null;
  private exdate: Date[] | null = null;
  private exrule: string | null = null;
  private interval: number | null = null;
  private freq: string | null = null;
  private weekdays: string[] = [];
  private ordinal_weekdays: string[] = [];
  private byday: string[] | null = null;
  private bymonthday: string[] = [];
  private byyearday: string[] = [];
  private bymonth: string[] = [];
  private byhour: string[] = [];
  private byminute: string[] = [];
  private bysetpos: string[] = [];
  private byweekno: string[] = [];
  private is_recurring: boolean = false;

  constructor(
    now_date: Date | null = null,
    preferred_time_range: [number, number] = [8, 19]
  ) {
    if (now_date === null) {
      now_date = new Date();
    }

    this.now_date = now_date;
    this.preferred_time_range = preferred_time_range;

    this._reset();

    // This looks like it was broken in the original python code since it
    // modifies the local variable instead of the class variable.
    // if (parse_constants && parse_constants.use24) {
    //   // The 24hr clock will always have this preferred time
    //   // and will not break pm specification
    //   preferred_time_range = [0, 12];
    // }
  }

  private _reset(): void {
    // rrule params
    this.dtstart = null;
    this.until = null;
    this.count = null;
    this.exdate = null;
    this.exrule = null;
    this.interval = null;
    this.freq = null;
    this.weekdays = [];
    this.ordinal_weekdays = [];
    this.byday = null;
    this.bymonthday = [];
    this.byyearday = [];
    this.bymonth = [];
    this.byhour = [];
    this.byminute = [];
    this.bysetpos = [];
    this.byweekno = [];
  }

  private getParams(): { [key: string]: any } {
    const params: { [key: string]: any } = {};

    if (!this.ordinal_weekdays.length && this.weekdays.length) {
      params['byday'] = this.weekdays.join(',');
    } else if (this.ordinal_weekdays.length) {
      params['byday'] = this.ordinal_weekdays.join(',');
    }

    if (this.bymonthday.length) {
      params['bymonthday'] = this.bymonthday.join(',');
    }
    if (this.byyearday.length) {
      params['byyearday'] = this.byyearday.join(',');
    }
    if (this.bymonth.length) {
      params['bymonth'] = this.bymonth.join(',');
    }
    if (this.byhour.length) {
      params['byhour'] = this.byhour.join(',');
    }
    if (this.byminute.length) {
      params['byminute'] = this.byminute.join(',');
    }
    if (this.bysetpos.length) {
      params['bysetpos'] = this.bysetpos.join(',');
    }
    if (this.byweekno.length) {
      params['byweekno'] = this.byweekno.join(',');
    }
    if (this.interval !== null) {
      params['interval'] = this.interval;
    }
    if (this.freq !== null) {
      params['freq'] = this.freq;
    }
    if (this.dtstart) {
      params['dtstart'] = this.dtstart.toISOString().substring(0, 10);
    }
    if (this.until) {
      params['until'] = this.until.toISOString().substring(0, 10);
    } else if (this.count !== null) {
      params['count'] = this.count;
    }
    if (this.exrule) {
      params['exrule'] = this.exrule;
    }
    if (this.exdate) {
      params['exdate'] = this.exdate.map(date => date.toISOString().substring(0, 10));
    }

    return params;
  }

  private getRFCRrule(): string | null {
    let rrule = '';
    const params = this.getParams();

    if (!('freq' in params)) {
      return null; // Not a valid RRULE
    }

    if ('dtstart' in params) {
      rrule += `DTSTART:${params['dtstart']}\n`;
    }

    const exdate = params['exdate'];
    const exrule = params['exrule'];

    rrule += 'RRULE:';
    const rules: string[] = [];

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' || typeof value === 'number') {
        const upperKey = key.toUpperCase();
        const upperValue = typeof value === 'string' ? value.toUpperCase() : value;
        rules.push(`${upperKey}=${upperValue}`);
      }
    }

    let result = rrule + rules.join(';');

    if (exrule !== null) {
      result += `\nEXRULE:${exrule}`;
    }

    if (exdate !== null) {
      const exd = this.adjust_exdates(result, exdate).join(',');
      if (exd) {
        const exdateString = `\nEXDATE:${exd}`;
        result += exdateString;
      }
    }

    return result;
  }

  public parse(s: string): string | null | Date {
    this._reset();
    if (!s) {
      return null;
    }
    s = this.normalize(s);
    s = this.handle_begin_end(s);
    const event = this.parse_start_and_end(s);
    if (!event) {
      return null;
    }
    this.is_recurring = this.parseEvent(event);
    if (this.is_recurring) {
      const m = XRegExp.exec(event, RE_AT_TIME) || XRegExp.exec(event, RE_TIME);
      if (m && !RE_DEF_TIME.test(m[0])) {
        this.byhour.push(this.get_hour(m.groups!.hour, m.groups!.mod).toString());
        let mn = m.groups!.minute;
        let mn_number = 0;
        if (mn === undefined) {
          mn_number = 0;
        }
        try {
          mn_number = parseInt(mn, 10);
          this.byminute.push(mn_number.toString());
        } catch (err) {
          // Ignore parsing error
        }
      }
      return this.getRFCRrule();
    }
    const date = this.parse_date(s);
    if (date !== null) {
      const [parsedDate, found] = this.parseTime(s, date);
      if (found) {
        return parsedDate;
      }
    }
    const [parsedDate, found] = this.parseTime(s, this.now_date);
    if (found) {
      return parsedDate;
    }
    return null;
  }

  parseTime(s: string, dt: Date): [Date, boolean] {
    let m = XRegExp.exec(s, RE_AT_TIME);
    if (!m) {
        m = xRegExactMatch(s, RE_TIME);
        if (m === null || ! XRegExp.exec(m[0], RE_DEF_TIME)) {
            m = null;
        }
    }
    if (m) {
        let hr: string | undefined = m.hour;
        let mn: string | undefined = m.minute;
        try {
            if (hr !== undefined) {
                if (mn !== undefined) {
                    return [new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), parseInt(hr, 10), parseInt(mn, 10)), true];
                }
                return [new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), parseInt(hr, 10)), true];
            }
        } catch (error) {
            // Ignore the error and fall through to the default return statement
        }
    }
    return [dt, false];
  }

  static increment_date(d: Date, amount: number, units: string = 'years'): Date {
    if (units === 'years') {
        try {
            return new Date(d.getFullYear() + amount, d.getMonth(), d.getDate());
        } catch (e) {
            const newYear = d.getFullYear() + amount;
            const result = new Date(newYear, 0, 1);
            result.setDate(d.getDate());
            return result
        }
    } else if (units === 'months') {
        let years = 0;
        let month = d.getMonth() + amount;
        if (month > 11) {
            years = Math.floor((month - 1) / 12);
            month = ((month - 1) % 12) + 1;
        }
        try {
            return new Date(d.getFullYear() + years, month, d.getDate());
        } catch (e) {
            const newYear = d.getFullYear() + years;
            const result = new Date(newYear, month, 1);
            result.setDate(d.getDate());
            return result;
        }
    } else {
        const multiplier = units === 'weeks' ? 7 : 1;
        const newDate = new Date(d.getTime() + (amount * multiplier * 24 * 60 * 60 * 1000));
        return newDate;
    }
  }

  parse_start_and_end(s: string): string | null {
    let m = xRegExactMatch(s, RE_EXCEPT);
    if (m) {
        s = m.groups!['event'];
        const exc = m.groups!['except'];
        const r = new RecurringEvent(this.now_date, this.preferred_time_range);
        const rfc = r.parse(exc);
        if (typeof rfc === 'string') {
            const rrMatch = XRegExp.exec(rfc, RE_RRULE);
            if (rrMatch) {
                this.exrule = rrMatch.groups!['rr'];
            }
        } else {
            this.exdate = this.extract_exdates(m.groups!['except']);
        }
    }
    m = xRegExactMatch(s, RE_START_EVENT);
    if (m) {
        this.dtstart = this.parse_date(m.groups!['starting']);
        const event = this.extract_ending(m.groups!['event']);
        return event;
    }
    m = XRegExp.exec(s, RE_EVENT_START);
    if (m) {
        const event = m.groups!['event'];
        const start = this.extract_ending(m.groups!['starting']);
        this.dtstart = this.parse_date(start);
        if (this.until && this.until < this.dtstart!) {
            this.until = RecurringEvent.increment_date(this.until, 1);
        }
        return event;
    }
    m = XRegExp.exec(s, RE_FROM_TO);
    if (m) {
        const event = m.groups!['event'];
        this.dtstart = this.parse_date(m.groups!['starting']);
        this.until = this.parse_date(m.groups!['ending']);
        if (this.until! < this.dtstart!) {
            this.until = RecurringEvent.increment_date(this.until!, 1);
        }
        return event;
    }
    return this.extract_ending(s);
  }

  extract_ending(s: string): string {
    let m = XRegExp.exec(s, RE_OTHER_END);
    if (m) {
        this.until = this.parse_date(m.groups!['ending']);
        if (this.dtstart && this.until! < this.dtstart) {
            this.until = RecurringEvent.increment_date(this.until!, 1);
        }
        return m.groups!['other'];
    }
    m = XRegExp.exec(s, RE_COUNT);
    if (m) {
        const event = m.groups!['event'];
        const twice = m.groups!['twice'];
        let count = m.groups!['count'];
        if (twice) {
            count = '2';
        }
        this.count = get_number(count);
        return event;
    }
    m = XRegExp.exec(s, RE_COUNT_UNTIL1);
    if (m) {
        const event = m.groups!['event'];
        const unit = m.groups!['unit'];
        this.until = RecurringEvent.increment_date(this.now_date, 1, unit + 's');
        return event;
    }
    m = XRegExp.exec(s, RE_COUNT_UNTIL);
    if (m) {
        const event = m.groups!['event'];
        const count = m.groups!['count'];
        const unit = m.groups!['unit'];
        this.until = RecurringEvent.increment_date(this.now_date, get_number(count), unit);
        return event;
    }
    return s;
  }

  extract_exdates(s: string): (Date | [string, number?] | null)[] {
    const result: (Date | [string, number?] | null)[] = [];
    const s_split = s.split(' and ');
    for (const d_str of s_split) {
        let m = xRegExactMatch(d_str, RE_MOY_NOT_ANCHORED); // Month
        if (m) {
            const rest = d_str.slice(m[0].length).trim();
            let yr: number | null = null;
            const y = xRegExactMatch(rest, RE_YEAR);
            if (!rest || y || (rest && !rest[0].match(/\d/))) { // e.g. may; may 2020; may would work, but not may 1
                if (y) {
                    yr = parseInt(y.groups!['year'], 10); // e.g. Feb 2020
                }
                const dt: [string, number?] = [get_MoY(m[0]), yr];
                result.push(dt);
                continue;
            }
        }

        const dt = this.parse_date(d_str);
        if (dt) {
            let hasDefiniteTime = false;
            XRegExp.forEach(d_str, RE_TIME, (m) => {
              if (!hasDefiniteTime) {
                if (xRegExactMatch(m[0], RE_DEF_TIME)) {
                    hasDefiniteTime = true;
                }
              }
            });
            if (!hasDefiniteTime) {
                result.push(dt instanceof Date ? dt : dt.date()); // Didn't find any definite times
            } else {
                result.push(dt);
            }
        }
    }
    // log.debug(`extract_exdates(${s}) = ${result}`);
    return result;
  }

  date_key(ex: Date | [number, number] | null): Date {
    if (ex instanceof Date) {
        return ex;
    } else if (ex instanceof Array) {
        if (ex[1] !== null) {
            return new Date(ex[1], ex[0], 1);
        } else if ((this.dtstart && ex[0] < this.dtstart.getMonth()) || ex[0] < this.now_date.getMonth()) {
            return new Date(this.now_date.getFullYear() + 1, ex[0], 1);
        } else {
            return new Date(this.now_date.getFullYear(), ex[0], 1);
        }
    } else {
        return new Date(ex.getFullYear(), ex.getMonth(), ex.getDate());
    }
  }

  /**
    * Adjust a list of exdates to ensure they specify the times and then properly format
    * them for the EXDATE rule, so things like "daily at 2pm except for tomorrow" will
    * work properly
   */
  adjust_exdates(rrules: string, exdate: (Date | [string, number?] | null)[]): string[] {
    exdate.sort((a, b) => this.date_key(a).getTime() - this.date_key(b).getTime());

    let needs_time = false;
    for (const ex of exdate) {
        if (!(ex instanceof Date)) {
            needs_time = true;
            break;
        }
    }

    if (needs_time) {
        const new_exdate: Date[] = [];
        try {
            const rs = rrulestr(rrules, { dtstart: this.now_date });
            let ndx = 0;
            for (const r of rs) {
                while (true) {
                    const ex = exdate[ndx];
                    if (ex instanceof Date) {
                        if (r.getTime() === ex.getTime()) {
                            new_exdate.push(ex);
                        }
                        if (r.getTime() >= ex.getTime()) {
                            ndx += 1;
                            if (ndx >= exdate.length) {
                                break;
                            }
                            continue;
                        }
                        break;
                    } else if (ex instanceof Array) { // A month, with an optional year
                        if (
                            r.getMonth() === ex[0] &&
                            (ex[1] === null || r.getFullYear() === ex[1])
                        ) {
                            ex[1] = r.getFullYear(); // Claim the year
                            new_exdate.push(r);
                        }
                        if (
                            ex[1] !== null &&
                            (r.getFullYear() > ex[1] ||
                                (r.getFullYear() === ex[1] && r.getMonth() > ex[0]))
                        ) {
                            ndx += 1;
                            if (ndx >= exdate.length) {
                                break;
                            }
                            continue;
                        }
                        break;
                    } else { // A date
                        const rd = new Date(r.getFullYear(), r.getMonth(), r.getDate());
                        if (rd.getTime() === ex.getTime()) {
                            new_exdate.push(r);
                        }
                        if (rd.getTime() > ex.getTime()) {
                            ndx += 1;
                            if (ndx >= exdate.length) {
                                break;
                            }
                            continue;
                        }
                        break;
                    }
                }
                if (ndx >= exdate.length) {
                    break;
                }
            }
            exdate = new_exdate;
        } catch (e) {
            // log.debug(`adjust_exdates(${rrules}, ${exdate}): Exception ${e}`);
        }
    }

    const result = exdate.map((e) => e instanceof Date ? e.toISOString() : e[0]);
    // log.debug(`adjust_exdates(${rrules}, ${exdate}) = ${result}`);
    return result;
  }


  parse_date(date_string: string): Date | null {
    let result = this.parse_singleton(date_string);
    if (result) {
        // log.debug(`parsed date string '${date_string}' to ${result}`);
        return result;
    }

    // TODO pdt?
    const { pdt } = this;
    const [timestruct, parse_result] = pdt.parse(date_string, this.now_date);
    if (parse_result) {
        // log.debug(
        //     `parsed date string '${date_string}' to ${timestruct.slice(0, 6)}`
        // );
        return new Date(
            timestruct[0],
            timestruct[1] - 1,
            timestruct[2],
            timestruct[3],
            timestruct[4],
            timestruct[5]
        );
    }

    return null;
  }

  eat_times(tokens: Token[]): Token[] {
    // Handle things like "at 10" or "10 am" and eat the 'number' token since we handle it elsewhere
    for (let i = 0; i < tokens.length; i++) {
        if (
            tokens[i].type_ === 'number' &&
            ((i + 1 < tokens.length && tokens[i + 1].type_ === 'ampm') ||
                (i !== 0 &&
                    tokens[i - 1].type_ === 'sep' &&
                    tokens[i - 1].text === 'at'))
        ) {
            tokens.splice(i, 1);
            break;
        }
    }
    return tokens;
  }

  fixup_ord_intervals(s: string): string {
      if (!XRegExp.test(s, RE_REPEAT)) {
          return s;
      }

      return XRegExp.replace(s, RE_ORD_DAY_WEEK_MONTH_OR_YEAR, (m: RegExpExecArray): string => {
        const ordx = get_ordinal_index(m.groups!.ord);
        let unit = m.groups!.unit;

        if (unit === 'day' && (s.includes('week') || s.includes('month') || s.includes('year'))) {
            return m[0]; // Don't change this kind!
        }

        if (unit === 'day' || unit === 'week' || unit === 'month' || unit === 'year') {
            unit += 's';
        } else if (
            XRegExp.test(s, RE_MOY_NOT_ANCHORED) ||
            s.includes('week') ||
            s.includes('month')
        ) {
            return m[0]; // Don't change this kind!
        } else {
            unit = get_DoW(unit).map((u) => plural_day_names[u].toLowerCase()).join(' and ');
        }

        return `${ordx} ${unit}`;
      });
  }

  process_thru(s: string): string {
    const sub_thru = (m: RegExpExecArray): string => {
        const first = m.groups!.first;
        const second = m.groups!.second;
        const dn = first.endsWith('s') || second.endsWith('s') ? plural_day_names : day_names;
        const firstDays = get_DoW(first);
        const secondDays = get_DoW(second);
        let result: string[] = [];

        if (firstDays.length === 1 && secondDays.length === 1 && firstDays[0] === secondDays[0]) {
            result = firstDays;
        } else {
            let currentDay = firstDays[0];
            result = [...firstDays];

            while (true) {
                currentDay = next_day[currentDay];
                result.push(currentDay);

                if (currentDay === secondDays[0]) {
                    result.push(...secondDays);
                    break;
                }
            }
        }

        result = result.map((n) => dn[n].toLowerCase());
        const formattedResult = result.join(' and ');

        // log.debug(`process_thru(${s}) = ${formattedResult}`);

        return formattedResult;
    };

    return XRegExp.replace(s, RE_THRU, sub_thru);
  }

  handleNthToTheLast(tokens: Token[]): Token[] {
    let i = 0;
    while (i < tokens.length) {
      if (tokens[i].type_ === 'ordinal' && tokens[i].text === 'last') {
        for (let j = i - 1; j >= 0; j--) {
          if (tokens[j].type_ === 'sep') {
            if (tokens[j].text === 'and') {
              break;
            }
          } else if (tokens[j].type_ === 'ordinal') {
            tokens[j].text = '-' + tokens[j].text;
            tokens.splice(i, 1);
            i--;
          }
        }
      }
      i++;
    }
    return tokens;
  }

  parseEvent(s: string): boolean {
    s = this.fixup_ord_intervals(s);
    s = this.process_thru(s);
    const tokenizer = new Tokenizer(s);
    tokenizer.tokens = this.handleNthToTheLast(tokenizer.tokens);
    tokenizer.tokens = this.eat_times(tokenizer.tokens);
    tokenizer.tokens = tokenizer.tokens.filter((t) => Tokenizer.CONTENT_TYPES.map((x) => x[0]).includes(t.type_));

    if (tokenizer.tokens.length === 0) {
      return false;
    }

    const types = new Set(tokenizer.tokens.map((t) => t.type_));

    // daily
    if (types.has('daily')) {
      this.interval = 1;
      this.freq = 'daily';
      return true;
    }

    // explicit weekdays
    if (types.has('plural_weekday') && !types.has('ordinal')) {
      const pluralWeekdayInterval = (): number => {
        if (s.includes('bi') || s.includes('every other')) {
          return 2;
        } else if (types.has('number')) {
          const i = tokenizer.tokens.findIndex((t) => t.type_ === 'number');
          const n = get_number(tokenizer.tokens[i].text);
          if (n !== null) {
            return n;
          }
        }
        return 1;
      };

      if (s.includes('weekdays')) {
        this.interval = pluralWeekdayInterval();
        this.freq = 'weekly';
        this.weekdays = ['MO', 'TU', 'WE', 'TH', 'FR'];
      } else if (s.includes('weekends')) {
        this.interval = pluralWeekdayInterval();
        this.freq = 'weekly';
        this.weekdays = ['SA', 'SU'];
      } else {
        this.freq = 'weekly';
        this.interval = pluralWeekdayInterval();
        for (let i = 0; i < RE_DOWS.length; i++) {
          if (RE_DOWS[i].test(s)) {
            this.weekdays.push(weekday_codes[i]);
          }
        }
      }
      return true;
    }

    // recurring phrases
    if (types.has('every') || types.has('recurring_unit')) {
      if (s.includes('every other')) {
        this.interval = 2;
      } else {
        this.interval = 1;
      }
      if (types.has('every')) {
        const i = tokenizer.tokens.findIndex((t) => t.type_ === 'every');
        tokenizer.tokens.splice(i, 1);
      }

      let index = 0;
      while (index < tokenizer.tokens.length) {
        if (tokenizer.tokens[index].type_ === 'number') {
          const n = get_number(tokenizer.tokens[index].text);
          if (n !== null) {
            this.interval = n;
          }
        } else if (tokenizer.tokens[index].type_ === 'unit') {
          const text = tokenizer.tokens[index].text;
          if (text === 'day' || text === 'week') {
            let gotSome = false;
            while (true) {
              if (index + 1 < tokenizer.tokens.length && tokenizer.tokens[index + 1].type_ === 'number') {
                index++;
                gotSome = true;
                const n = get_number(tokenizer.tokens[index].text);
                if (n !== null) {
                  if (text === 'day') {
                    if (this.freq === 'monthly' || (this.freq === 'yearly' && this.bymonth)) {
                      this.bymonthday.push(String(n));
                    } else {
                      this.byyearday.push(String(n));
                      this.freq = 'yearly';
                    }
                  } else {
                    this.byweekno.push(String(n));
                    this.freq = 'yearly';
                  }
                }
                if (index >= tokenizer.tokens.length) break;
              } else {
                break;
              }
            }
            if (gotSome) {
              index++;
              continue;
            }
          }
          if (tokenizer.tokens[index].text !== 'day' ||
              (this.freq !== 'weekly' && this.freq !== 'monthly' && this.freq !== 'yearly')) {
            this.freq = get_unit_freq(tokenizer.tokens[index].text);
          }
        } else if (tokenizer.tokens[index].type_ === 'recurring_unit') {
          this.freq = tokenizer.tokens[index].text;
        } else if (tokenizer.tokens[index].type_ === 'ordinal') {
          const ords: number[] = [get_ordinal_index(tokenizer.tokens[index].text)];

          while (index + 1 < tokenizer.tokens.length && tokenizer.tokens[index + 1].type_ === 'ordinal') {
            ords.push(get_ordinal_index(tokenizer.tokens[index + 1].text));
            index++;
          }

          if (index + 2 < tokenizer.tokens.length && tokenizer.tokens[index + 1].type_ === 'unit' &&
              tokenizer.tokens[index + 1].text === 'day' && tokenizer.tokens[index + 2].type_ === 'unit') {
            index++;
          }

          if (index + 1 < tokenizer.tokens.length &&
              (tokenizer.tokens[index + 1].type_ === 'DoW' || tokenizer.tokens[index + 1].type_ === 'plural_weekday')) {
            const dow = get_DoW(tokenizer.tokens[index + 1].text)[0];
            this.ordinal_weekdays.push(...ords.map((ord) => `${ord}${dow}`));
            index += 2;
            continue;
          } else if (index + 1 < tokenizer.tokens.length && tokenizer.tokens[index + 1].type_ === 'number') {
            const n = get_number(tokenizer.tokens[index + 1].text);
            if (n !== null) {
              this.interval = n;
            }
            index++;
          }

          if (index + 1 < tokenizer.tokens.length && tokenizer.tokens[index + 1].type_ === 'unit' &&
              tokenizer.tokens[index + 1].text === 'day' &&
              (this.freq === 'monthly' || this.freq === 'yearly' || this.freq === 'weekly')) {
            index++;
          }

          if (index + 1 < tokenizer.tokens.length && tokenizer.tokens[index + 1].type_ === 'unit') {
            this.freq = get_unit_freq(tokenizer.tokens[index + 1].text);
            if (this.freq === 'monthly') {
              this.bymonthday.push(...ords.map((ord) => String(ord)));
            } else if (this.freq === 'yearly') {
              this.byyearday.push(...ords.map((ord) => String(ord)));
            } else if (this.freq === 'weekly') {
              this.weekdays.push(...ords.map((ord) => ordered_weekday_codes[ord % 8]));
            }
            index++;
          }
        }
        index++;
      }
      return true;
    }

    // monthly
    if (types.has('month')) {
      if (types.has('ordinal')) {
        const i = tokenizer.tokens.findIndex((t) => t.type_ === 'ordinal');
        const ord = get_ordinal_index(tokenizer.tokens[i].text);
        this.bymonthday.push(String(ord));
      }
      this.freq = 'monthly';
      return true;
    }

    // yearly
    if (types.has('year')) {
      this.freq = 'yearly';
      if (types.has('ordinal')) {
        const i = tokenizer.tokens.findIndex((t) => t.type_ === 'ordinal');
        const ord = get_ordinal_index(tokenizer.tokens[i].text);
        this.byyearday.push(String(ord));
      }
      if (types.has('plural_weekday')) {
        const i = tokenizer.tokens.findIndex((t) => t.type_ === 'plural_weekday');
        const dow = get_DoW(tokenizer.tokens[i].text)[0];
        this.bymonthday.push(`${dow}L`);
      }
      if (types.has('month')) {
        const i = tokenizer.tokens.findIndex((t) => t.type_ === 'month');
        const month = getMonth(tokenizer.tokens[i].text);
        if (month !== null) {
          this.bymonth = [month];
        }
      }
      return true;
    }

    return false;
  }


  parseSingleton(s: string): Date | null {
    try {
      const tokenizer = new Tokenizer(s);
      const nowDate = this.now_date;

      if (tokenizer.tokens.length < 2 || tokenizer.tokens.length > 5) {
        return null;
      }

      if (tokenizer.tokens[0].type_ !== 'ordinal') {
        return null;
      }

      if (tokenizer.tokens[1].type_ === 'ordinal') {
        return null;
      }

      if (tokenizer.tokens[tokenizer.tokens.length - 1].type_ === 'number') {
        const year = get_number(tokenizer.tokens[tokenizer.tokens.length - 1].text);
        if (year >= 1000) {
          nowDate.setFullYear(year);
        }
        tokenizer.tokens.pop();
      }

      let s: string;
      if (tokenizer.tokens[tokenizer.tokens.length - 1].type_ === 'MoY') {
        if (
          (tokenizer.tokens[tokenizer.tokens.length - 2].type_ !== 'ordinal' &&
          tokenizer.tokens[tokenizer.tokens.length - 2].type_ !== 'DoW') ||
          tokenizer.tokens.length > 4
        ) {
          return null;
        }
        s = tokenizer.tokens.map((t) => t.text).join(' ');
      } else if (
        tokenizer.tokens[tokenizer.tokens.length - 1].type_ === 'unit' &&
        tokenizer.tokens[tokenizer.tokens.length - 1].text !== 'day'
      ) {
        if (tokenizer.tokens.length > 4) {
          return null;
        }
        const units = tokenizer.tokens[tokenizer.tokens.length - 1].text;
        s = tokenizer.tokens.slice(0, -1).map((t) => t.text).join(' ');
        s += ` of the ${units}`;
      } else if (tokenizer.tokens[tokenizer.tokens.length - 1].text === 'day') {
        if (tokenizer.tokens.length >= 3) {
          return null;
        }
        s = `${tokenizer.tokens[0].text} of the year`;
      } else {
        return null;
      }

      s = s.replace(/[-]([a-z0-9]+)/g, '$1 last');

      const rfc = this.parse(`every ${s}`);
      if (!rfc) {
        return null;
      }

      const ruleSet = new RRuleSet();
      const rule = RRule.fromString(rfc);
      ruleSet.rrule(rule);
      const dates = ruleSet.all();
      if (dates.length === 0) {
        return null;
      }

      return dates[0];
    } catch (e) {
      // console.debug(`parse_singleton(${s}): Exception ${e}`);
    }

    return null;
  }

  get_hour(hr: number, mod: string | null): number {
    // hr = Math.floor(hr);

    if (mod !== null) {
      if (mod.toLowerCase().startsWith('p')) {
        if (hr === 12) {
          return 12;
        }
        return hr + 12;
      }

      if (hr === 12) {
        return 0;
      }
      return hr;
    }

    if (hr > 12) {
      return hr;
    }

    if (hr === 0) {
      return 0;
    }

    if (hr < this.preferred_time_range[0]) {
      return hr + 12;
    }

    return hr;
  }

  format(rrule_or_datetime: RRule | RRuleSet | Date | null): string | null {
    if (rrule_or_datetime === null) {
      return null;
    }

    if (rrule_or_datetime instanceof Date) {
      if (!(rrule_or_datetime instanceof Date) || rrule_or_datetime.getHours() === 0) {
        return rrule_or_datetime
          .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          .replace(/ 0/g, ' ');
      } else if (rrule_or_datetime.getMinutes() === 0 && rrule_or_datetime.getSeconds() === 0) {
        return rrule_or_datetime
          .toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', hour12: true })
          .replace(/ 0/g, ' ')
          .replace('AM', 'am')
          .replace('PM', 'pm');
      } else if (rrule_or_datetime.getSeconds() === 0) {
        return rrule_or_datetime
          .toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })
          .replace(/ 0/g, ' ')
          .replace('AM', 'am')
          .replace('PM', 'pm');
      } else {
        return rrule_or_datetime
          .toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })
          .replace(/ 0/g, ' ')
          .replace('AM', 'am')
          .replace('PM', 'pm');
      }
    }

    function number_suffix(n: number): string {
      if (n === -1) {
        return 'last';
      } else if (n < 0) {
        return number_suffix(-n) + ' to the last';
      }
      const digit = n % 10;
      if ([0, 4, 5, 6, 7, 8, 9].includes(digit)) {
        return n + 'th';
      } else if (digit === 1) {
        return n + 'st';
      } else if (digit === 2) {
        return n + 'nd';
      } else { // if (digit === 3) {
        return n + 'rd';
      }
    }

    function every_fr_interval_name(fr: string, n: number): string {
      const result = 'every';
      const suffix = fr.toLowerCase().replace('ly', '').replace('dai', 'day');
      if (n <= 1) {
        if (suffix === 'day') {
          return 'daily';
        }
        return result + ' ' + suffix;
      } else if (n === 2) {
        return `${result} other ${suffix}`;
      } else {
        return `${result} ${n} ${suffix}s`;
      }
    }

    function byday_name(bd: string | null): string {
      if (bd === null) {
        return ''; // pragma nocover
      }
      try {
        if (bd.length === 4) {
          if (bd[0] === '+') {
            bd = bd.slice(1);
          } else if (bd[0] === '-') {
            if (bd[1] === '1') {
              return 'last ' + day_names[bd.slice(2)];
            } else {
              return number_suffix(parseInt(bd[1])) + ' to the last ' + day_names[bd.slice(2)];
            }
          }
        }

        if (bd.length === 3) {
          return number_suffix(parseInt(bd[0])) + ' ' + day_names[bd.slice(1)];
        } else if (bd.length === 2) {
          return day_names[bd];
        }
      } catch (e) {
        // log.debug(`byday_name(${bd}): Exception ${e}`);
        throw e;
      }
      return bd; // pragma nocover
    }

    function byday_squasher(s: string | null): string | null {
      if (s === null) {
        return s; // pragma nocover
      }
      const re_squasher = /((?:\d.. to the )?last|\d..)\s(Mon|Tue|Wed|Thu|Fri|Sat|Sun) and ((?:\d.. to the )?last|\d..)\s\2/g;
      while (true) {
        const t: string = s.replace(re_squasher, '$1 and $3 $2');
        if (t === s) {
          return t;
        }
        s = t;
      }
    }

    function toint(v: string | number): number {
      try {
        return parseInt(v as string);
      } catch (e) {
        // Ignore exception
      }
      return v as number;
    }

    function todatetime(v: number | string): Date | number | string {
      if (!v) {
        return v;
      }
      try {
        if (typeof v === 'number') {
          if (v >= 10000000) {
            return todatetime(v.toString()); // YYYYmmdd
          } else {
            return v;
          }
        }
        if (v.includes('T') && v[0].match(/\d/)) {
          return moment(v, 'YYYYMMDDTHHmmSS').toDate();
        } else if (v[0].match(/\d/) && v.length === 8) {
          return moment(v, 'YYYYMMDD').toDate();
        }
      } catch (e) {
        // log.debug(`todatetime(${v}): Exception ${e}`);
        // Ignore exception
      }
      return v;
    }

    function list_handler(func: (value: any) => any, lst: any[], join_str = ' and '): string {
      if (Array.isArray(lst)) {
        const result = lst.map(func).join(join_str);
        // log.debug(`list_handler(${func.name}, ${lst}, ${join_str}) = ${result}`);
        return result;
      } else {
        const result = func(lst);
        // log.debug(`list_handler(${func.name}, ${lst}, ${join_str}) = ${result}`);
        return result;
      }
    }

    function month_name(n: number): string {
      try {
        return monthAbbr[n];
      } catch (e) {
        // pragma nocover
        return n.toString();
      }
    }

    /**
     * Sample:
     * DTSTART:19970930T090000
     * RRULE:FREQ=MONTHLY;COUNT=10;BYMONTHDAY=1,-1
     * EXDATE:19960402T010000,19960403T010000,19960404T010000
     */
    function parseRRule(r: string): Record<string, any> {
      r = String(r); // If it's an rrule, convert to the string representation
      const result: Record<string, any> = {};
      const elements = r.split('\n');

      for (const element of elements) {
        let name: string;
        let values: string;
        if (element.includes(':')) {
          [name, values] = element.split(':');
        } else {
          name = element;
          values = '';
        }

        const vls: Record<string, any> = {};
        for (const value of values.split(';')) {
          if (value.includes('=')) {
            const [k, v] = value.split('=');
            let parsedValue: any = todatetime(toint(v));
            if (typeof parsedValue === 'string' && parsedValue.includes(',')) {
              const list: any[] = [];
              for (const e of parsedValue.split(',')) {
                const parsedElement = todatetime(toint(e));
                list.push(parsedElement);
              }
              parsedValue = list;
            }
            vls[k] = parsedValue;
          } else {
            vls[value] = null;
          }
        }

        if (Object.keys(vls).length === 1 && vls[Object.keys(vls)[0]] === null) {
          let parsedValues: any = Object.keys(vls)[0];
          if (typeof parsedValues === 'string' && parsedValues.includes(',')) {
            const list: any[] = [];
            for (const e of parsedValues.split(',')) {
              const parsedElement = todatetime(toint(e));
              list.push(parsedElement);
            }
            parsedValues = list;
          } else {
            parsedValues = todatetime(toint(parsedValues));
          }
          result[name] = parsedValues;
        } else {
          result[name] = vls;
        }
      }

      // log.debug(`parse_rrule(${r}) = ${JSON.stringify(result)}`);
      return result;
    }

    // Note: Here the format() function continues after those many nested functions.
    let result = '';
    try {
      let pr: Record<string, any>;
      if (typeof rrule_or_datetime === 'object' && !Array.isArray(rrule_or_datetime)) {
        pr = rrule_or_datetime as Record<string, any>; // Already parsed
      } else {
        pr = parseRRule(rrule_or_datetime as string);
      }
      if (!pr['RRULE']) {
        return String(rrule_or_datetime);
      }
      const rr = pr['RRULE'];
      if (!rr['FREQ']) {
        return String(rrule_or_datetime);
      }
      const fr = rr['FREQ'];
      const interval = rr['INTERVAL'] || 1;

      function addSuffix(pr: Record<string, any>): string {
        return addTime(pr['RRULE']) + addStartEnd(pr) + addExcepts(pr);
      }

      function addTime(rr: Record<string, any>): string {
        const byhour = rr['BYHOUR'];
        if (byhour === undefined) {
          return '';
        }
        const byminute = rr['BYMINUTE'] || 0;
        const tm = new Date();
        tm.setHours(byhour, byminute);
        if (byminute === 0) {
          return ' at' + tm.toLocaleString('en-US', { hour: 'numeric', hour12: true });
        }
        return ' at' + tm.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
      }

      // Note: Use arrow function so that the 'this' context is preserved.
      const addStartEnd = (pr: Record<string, any>): string => {
        const now = this.now_date.replace(/:\d+$/, ''); // Remove microseconds
        const start = pr['DTSTART'];
        const rr = pr['RRULE'];
        let end = rr['UNTIL'];
        let count = rr['COUNT'];
        let result = '';

        const adjNow = (() => {
          const interval = rr['INTERVAL'] || 1;
          const freq = rr['FREQ'];

          if (freq === 'SECONDLY') {
            return new Date(now.getTime() + interval * 1000);
          } else if (freq === 'MINUTELY') {
            return new Date(now.getTime() + interval * 60000);
          } else {
            return new Date(now.getTime() + interval * 86400000);
          }
        })();

        const startingNeeded = (): boolean => {
          try {
            const r1 = new RRule(RRule.fromString(rrule_or_datetime), { dtstart: this.now_date });
            const r2 = new RRule(RRule.fromString(rrule_or_datetime.replace(/^DTSTART.*?\n/m, '')), { dtstart: this.now_date });
            if (r1.all()[0].toISO() === r2.all()[0].toISO()) {
              return false;
            }
          } catch (e) {
            // console.error(`Error in startingNeeded: ${e}`);
          }
          return true;
        }

        if (start !== null && start !== now && start !== adjNow && startingNeeded()) {
          if (end !== null) {
            result += ' from ' + this.format(start);
            result += ' to ' + this.format(end);
            end = null;
            count = null;
          } else {
            result += ' starting ' + this.format(start);
          }
        }
        if (end !== null) {
          result += ' until ' + this.format(end);
        } else if (count !== null) {
          if (count === 2) {
            result += ' twice';
          } else {
            result += ` for ${count} times`;
          }
        }
        return result;
      }

      const squashExceptMonths = (exdates: Date[]): string[] | null => {
        const months: Set<[number, number]> = new Set();
        let maxYear = 0;

        for (const e of exdates) {
          months.add([e.getFullYear(), e.getMonth() + 1]);
          maxYear = Math.max(maxYear, e.getFullYear());
        }

        try {
          const rr = new RRule(RRule.fromString(rrule_or_datetime), { dtstart: this.now_date });
          for (const r of rr.all()) {
            if (r.getFullYear() > maxYear) {
              break;
            }
            if (months.has([r.getFullYear(), r.getMonth() + 1])) {
              return null; // Not excluded
            }
          }

          const sortedMonths = Array.from(months).sort();
          return sortedMonths.map(([year, month]) => {
            const monthName = this.monthName(month);
            if (year !== this.now_date.getFullYear()) {
              return `${monthName} ${year}`;
            }
            return monthName;
          });
        } catch (e) {
          // console.error(`Error in squashExceptMonths: ${e}`);
          return null;
        }
      }

      const addExcepts = (pr: { [key: string]: any }): string => {
        const exrule = pr['EXRULE'];
        if (exrule) {
          const exc = this.format({ RRULE: exrule });
          return ' except ' + exc;
        }

        const exdates = pr['EXDATE'];
        if (!exdates) {
          return '';
        }

        if (Array.isArray(exdates) && exdates.length > 2) {
          const squash = squashExceptMonths(exdates);
          if (squash) {
            return ' except in ' + squash.join(' and ');
          }
        }

        return ' except on ' + list_handler(this.format.bind(this), exdates);
      }

      function addBysetpos(rr: { [key: string]: any }, add: string = ' '): string {
        const bysetpos = rr['BYSETPOS'];
        if (!bysetpos) {
          return '';
        }
        return add + 'for the ' + list_handler(number_suffix, bysetpos) + ' instance of ';
      }

      // Note: Code for format() continues here after more nested functions.
      const bymonthday = rr['BYMONTHDAY'];
      const byday = rr['BYDAY'];

      if (fr === 'YEARLY') {
        let result = every_fr_interval_name(fr, interval);
        const bymonth = rr['BYMONTH'];
        const byyearday = rr['BYYEARDAY'];
        const byweekno = rr['BYWEEKNO'];

        if (bymonthday !== undefined && bymonth !== undefined) {
          if (result.endsWith(' year')) {
            result = result.slice(0, -5);
          }

          result += addBysetpos(rr);
          result += ' ' + list_handler(month_name, bymonth, ' or ') + ' ' + list_handler(number_suffix, bymonthday);
          return result + addSuffix(pr);
        } else if (byday !== undefined && bymonth !== undefined) {
          if (result.endsWith(' year')) {
            result = result.slice(0, -5);
            result += addBysetpos(rr);
            result += ' ' + byday_squasher(list_handler(byday_name, byday)) + ' in ' + list_handler(month_name, bymonth, ' or ');
          } else {
            result += addBysetpos(rr);
            result += ' on the ' + byday_squasher(list_handler(byday_name, byday)) + ' in ' + list_handler(month_name, bymonth, ' or ');
          }

          return result + addSuffix(pr);
        } else if (byyearday !== undefined) {
          result += addBysetpos(rr);
          result += ' on the ' + list_handler(number_suffix, byyearday) + ' day';
          return result + addSuffix(pr);
        } else if (byday !== undefined && byweekno !== undefined) {
          if (result.endsWith(' year')) {
            result = result.slice(0, -5);
            result += addBysetpos(rr);
            result += ' ' + byday_squasher(list_handler(byday_name, byday)) + ' in week ' + list_handler(String, byweekno);
          } else {
            result += addBysetpos(rr);
            result += ' on ' + byday_squasher(list_handler(byday_name, byday)) + ' in week ' + list_handler(String, byweekno);
          }

          return result + addSuffix(pr);
        } else if (byweekno !== undefined) {
          result += addBysetpos(rr);
          result += ' in week ' + list_handler(String, byweekno);
          return result + addSuffix(pr);
        }
      } else if (fr === 'MONTHLY') {
        if (bymonthday !== undefined) {
          return addBysetpos(rr, '') + list_handler(number_suffix, bymonthday) + ' of ' + every_fr_interval_name(fr, interval) + addSuffix(pr);
        } else if (byday !== undefined) {
          return addBysetpos(rr, '') + byday_squasher(list_handler(byday_name, byday)) + ' of ' + every_fr_interval_name(fr, interval) + addSuffix(pr);
        }
      } else if (fr === 'WEEKLY') {
        if (byday !== undefined) {
          let result = every_fr_interval_name(fr, interval) + addBysetpos(rr) + ' on ' + list_handler(byday_name, byday)
            .replace('Sat and Sun', 'weekend')
            .replace('Mon and Tue and Wed and Thu and Fri', 'weekday') + addSuffix(pr);

          result = result.replace('every week on ', 'every ');
          result = result.replace(/^every weekend$/, 'weekends');
          result = result.replace(/^every weekday$/, 'weekdays');
          return result;
        }
      } else if (fr === 'DAILY' || fr === 'HOURLY' || fr === 'MINUTELY' || fr === 'SECONDLY') {
        return every_fr_interval_name(fr, interval) + addBysetpos(rr) + addSuffix(pr);
      } else {
        // log.debug(`format(${rrule_or_datetime}): Case not handled!`);
      }

    } catch (e) {
      // console.error(`Error formatting rrule: ${e}`);
    }

    return rrule_or_datetime;

  }


}
