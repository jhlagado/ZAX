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
push DE                        ; 0132: D5
push HL                        ; 0133: E5
ld de, pair_buf                ; 0134: 11 00 00
ld HL, $0001                   ; 0137: 21 01 00
add HL, DE                     ; 013A: 19
ld E, (HL)                     ; 013B: 5E
pop HL                         ; 013C: E1
ld H, E                        ; 013D: 63
pop DE                         ; 013E: D1
__zax_epilogue_1:
pop DE                         ; 013F: D1
pop BC                         ; 0140: C1
pop AF                         ; 0141: F1
ld SP, IX                      ; 0142: DD F9
pop IX                         ; 0144: DD E1
ret                            ; 0146: C9
; func main begin
; func read_pair_word end
main:
push IX                        ; 0147: DD E5
ld IX, $0000                   ; 0149: DD 21 00 00
add IX, SP                     ; 014D: DD 39
push AF                        ; 014F: F5
push BC                        ; 0150: C5
push DE                        ; 0151: D5
push HL                        ; 0152: E5
ld HL, $0002                   ; 0153: 21 02 00
push HL                        ; 0156: E5
ld HL, $0001                   ; 0157: 21 01 00
push HL                        ; 015A: E5
call write_pair                ; 015B: CD 00 00
inc SP                         ; 015E: 33
inc SP                         ; 015F: 33
inc SP                         ; 0160: 33
inc SP                         ; 0161: 33
ld A, (pair_buf)               ; 0162: 3A 00 00
call read_pair_word            ; 0165: CD 00 00
__zax_epilogue_2:
pop HL                         ; 0168: E1
pop DE                         ; 0169: D1
pop BC                         ; 016A: C1
pop AF                         ; 016B: F1
ld SP, IX                      ; 016C: DD F9
pop IX                         ; 016E: DD E1
ret                            ; 0170: C9
; func main end

; symbols:
; label write_pair = $0100
; label __zax_epilogue_0 = $0118
; label read_pair_word = $0121
; label __zax_epilogue_1 = $013F
; label main = $0147
; label __zax_epilogue_2 = $0168
; data pair_buf = $1000
; label __zax_startup = $1002
