; ZAX lowered .asm trace
; range: $0100..$1055 (end exclusive)

; func write_pair begin
write_pair:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push HL                        ; 010B: E5
push AF                        ; 010C: F5
push BC                        ; 010D: C5
push DE                        ; 010E: D5
push IX                        ; 010F: DD E5
pop HL                         ; 0111: E1
ld DE, $0004                   ; 0112: 11 04 00
add HL, DE                     ; 0115: 19
push HL                        ; 0116: E5
pop HL                         ; 0117: E1
pop DE                         ; 0118: D1
pop BC                         ; 0119: C1
pop AF                         ; 011A: F1
ld a, (hl)                     ; 011B: 7E
push AF                        ; 011C: F5
push AF                        ; 011D: F5
push BC                        ; 011E: C5
push DE                        ; 011F: D5
ld HL, pair_buf                ; 0120: 21 00 00
pop DE                         ; 0123: D1
pop BC                         ; 0124: C1
pop AF                         ; 0125: F1
pop AF                         ; 0126: F1
ld (hl), a                     ; 0127: 77
push AF                        ; 0128: F5
push BC                        ; 0129: C5
push DE                        ; 012A: D5
push IX                        ; 012B: DD E5
pop HL                         ; 012D: E1
ld DE, $0006                   ; 012E: 11 06 00
add HL, DE                     ; 0131: 19
push HL                        ; 0132: E5
pop HL                         ; 0133: E1
pop DE                         ; 0134: D1
pop BC                         ; 0135: C1
pop AF                         ; 0136: F1
ld a, (hl)                     ; 0137: 7E
push AF                        ; 0138: F5
push AF                        ; 0139: F5
push BC                        ; 013A: C5
push DE                        ; 013B: D5
ld HL, pair_buf + 1            ; 013C: 21 00 00
pop DE                         ; 013F: D1
pop BC                         ; 0140: C1
pop AF                         ; 0141: F1
pop AF                         ; 0142: F1
ld (hl), a                     ; 0143: 77
__zax_epilogue_0:
pop HL                         ; 0144: E1
pop DE                         ; 0145: D1
pop BC                         ; 0146: C1
pop AF                         ; 0147: F1
ld SP, IX                      ; 0148: DD F9
pop IX                         ; 014A: DD E1
ret                            ; 014C: C9
; func read_pair_word begin
; func write_pair end
read_pair_word:
push IX                        ; 014D: DD E5
ld IX, $0000                   ; 014F: DD 21 00 00
add IX, SP                     ; 0153: DD 39
push AF                        ; 0155: F5
push BC                        ; 0156: C5
push DE                        ; 0157: D5
push AF                        ; 0158: F5
push BC                        ; 0159: C5
push DE                        ; 015A: D5
ld HL, pair_buf                ; 015B: 21 00 00
pop DE                         ; 015E: D1
pop BC                         ; 015F: C1
pop AF                         ; 0160: F1
ld L, (hl)                     ; 0161: 6E
push AF                        ; 0162: F5
push BC                        ; 0163: C5
push DE                        ; 0164: D5
ld HL, pair_buf + 1            ; 0165: 21 00 00
pop DE                         ; 0168: D1
pop BC                         ; 0169: C1
pop AF                         ; 016A: F1
ld H, (hl)                     ; 016B: 66
__zax_epilogue_1:
pop DE                         ; 016C: D1
pop BC                         ; 016D: C1
pop AF                         ; 016E: F1
ld SP, IX                      ; 016F: DD F9
pop IX                         ; 0171: DD E1
ret                            ; 0173: C9
; func main begin
; func read_pair_word end
main:
push IX                        ; 0174: DD E5
ld IX, $0000                   ; 0176: DD 21 00 00
add IX, SP                     ; 017A: DD 39
push AF                        ; 017C: F5
push BC                        ; 017D: C5
push DE                        ; 017E: D5
push HL                        ; 017F: E5
ld HL, $0002                   ; 0180: 21 02 00
push HL                        ; 0183: E5
ld HL, $0001                   ; 0184: 21 01 00
push HL                        ; 0187: E5
call write_pair                ; 0188: CD 00 00
inc SP                         ; 018B: 33
inc SP                         ; 018C: 33
inc SP                         ; 018D: 33
inc SP                         ; 018E: 33
push AF                        ; 018F: F5
push BC                        ; 0190: C5
push DE                        ; 0191: D5
ld HL, pair_buf                ; 0192: 21 00 00
pop DE                         ; 0195: D1
pop BC                         ; 0196: C1
pop AF                         ; 0197: F1
ld A, (hl)                     ; 0198: 7E
call read_pair_word            ; 0199: CD 00 00
__zax_epilogue_2:
pop HL                         ; 019C: E1
pop DE                         ; 019D: D1
pop BC                         ; 019E: C1
pop AF                         ; 019F: F1
ld SP, IX                      ; 01A0: DD F9
pop IX                         ; 01A2: DD E1
ret                            ; 01A4: C9
; func main end

; symbols:
; label write_pair = $0100
; label __zax_epilogue_0 = $0144
; label read_pair_word = $014D
; label __zax_epilogue_1 = $016C
; label main = $0174
; label __zax_epilogue_2 = $019C
; data pair_buf = $1000
; label __zax_startup = $1002
