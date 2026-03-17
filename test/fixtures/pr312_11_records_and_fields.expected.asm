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
ld A, (ix+$04)                 ; 010C: DD 7E 04
ld (pair_buf), A               ; 010F: 32 00 00
ld A, (ix+$06)                 ; 0112: DD 7E 06
ld (pair_buf + 1), A           ; 0115: 32 00 00
__zax_epilogue_0:
pop HL                         ; 0118: E1
pop DE                         ; 0119: D1
pop BC                         ; 011A: C1
pop AF                         ; 011B: F1
ld SP, IX                      ; 011C: DD F9
pop IX                         ; 011E: DD E1
ret                            ; 0120: C9
; func read_pair_word begin
; func write_pair end
read_pair_word:
push IX                        ; 0121: DD E5
ld IX, $0000                   ; 0123: DD 21 00 00
add IX, SP                     ; 0127: DD 39
push AF                        ; 0129: F5
push BC                        ; 012A: C5
push DE                        ; 012B: D5
push AF                        ; 012C: F5
ld A, (pair_buf)               ; 012D: 3A 00 00
ld L, A                        ; 0130: 6F
pop AF                         ; 0131: F1
push AF                        ; 0132: F5
ld A, (pair_buf + 1)           ; 0133: 3A 00 00
ld H, A                        ; 0136: 67
pop AF                         ; 0137: F1
__zax_epilogue_1:
pop DE                         ; 0138: D1
pop BC                         ; 0139: C1
pop AF                         ; 013A: F1
ld SP, IX                      ; 013B: DD F9
pop IX                         ; 013D: DD E1
ret                            ; 013F: C9
; func main begin
; func read_pair_word end
main:
push IX                        ; 0140: DD E5
ld IX, $0000                   ; 0142: DD 21 00 00
add IX, SP                     ; 0146: DD 39
push AF                        ; 0148: F5
push BC                        ; 0149: C5
push DE                        ; 014A: D5
push HL                        ; 014B: E5
ld HL, $0002                   ; 014C: 21 02 00
push HL                        ; 014F: E5
ld HL, $0001                   ; 0150: 21 01 00
push HL                        ; 0153: E5
call write_pair                ; 0154: CD 00 00
inc SP                         ; 0157: 33
inc SP                         ; 0158: 33
inc SP                         ; 0159: 33
inc SP                         ; 015A: 33
ld A, (pair_buf)               ; 015B: 3A 00 00
call read_pair_word            ; 015E: CD 00 00
__zax_epilogue_2:
pop HL                         ; 0161: E1
pop DE                         ; 0162: D1
pop BC                         ; 0163: C1
pop AF                         ; 0164: F1
ld SP, IX                      ; 0165: DD F9
pop IX                         ; 0167: DD E1
ret                            ; 0169: C9
; func main end

; symbols:
; label write_pair = $0100
; label __zax_epilogue_0 = $0118
; label read_pair_word = $0121
; label __zax_epilogue_1 = $0138
; label main = $0140
; label __zax_epilogue_2 = $0161
; data pair_buf = $1000
; label __zax_startup = $1002
