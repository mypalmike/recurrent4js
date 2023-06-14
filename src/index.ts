import XRegExp, { ExecArray } from 'xregexp';

// Helper function to work like python's re.match.
function xRegExactMatch(input: string, pattern: RegExp): RegExpExecArray | null {
  const match = XRegExp.exec(input, pattern);
  return match !== null && match[0].length === input.length ? match : null;
}

export const recurrent4js = (name: string): string => "Hello, " + name + "!";

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
  CONTENT_TYPES: Array<[string, RegExp]> = [
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

  TYPES: Array<[string, RegExp]> = [
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
      for (const [type_, regex] of this.TYPES) {
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
  private bymonthday: number[] = [];
  private byyearday: number[] = [];
  private bymonth: number[] = [];
  private byhour: number[] = [];
  private byminute: number[] = [];
  private bysetpos: number[] = [];
  private byweekno: number[] = [];
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
    this.is_recurring = this.parse_event(event);
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
      return this.get_RFC_rrule();
    }
    const date = this.parse_date(s);
    if (date !== null) {
      const [parsedDate, found] = this.parse_time(s, date);
      if (found) {
        return parsedDate;
      }
    }
    const [parsedDate, found] = this.parse_time(s, this.now_date);
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




}
