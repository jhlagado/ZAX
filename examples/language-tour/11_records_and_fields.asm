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
ld A, (ix+$04)                 ; 010D: DD 7E 04
ld (pair_buf), A               ; 0110: 32 00 00
pop AF                         ; 0113: F1
push AF                        ; 0114: F5
ld A, (ix+$06)                 ; 0115: DD 7E 06
ld (pair_buf + 1), A           ; 0118: 32 00 00
pop AF                         ; 011B: F1
__zax_epilogue_0:
pop HL                         ; 011C: E1
pop DE                         ; 011D: D1
pop BC                         ; 011E: C1
pop AF                         ; 011F: F1
ld SP, IX                      ; 0120: DD F9
pop IX                         ; 0122: DD E1
ret                            ; 0124: C9
; func read_pair_word begin
; func write_pair end
read_pair_word:
push IX                        ; 0125: DD E5
ld IX, $0000                   ; 0127: DD 21 00 00
add IX, SP                     ; 012B: DD 39
push AF                        ; 012D: F5
push BC                        ; 012E: C5
push DE                        ; 012F: D5
push AF                        ; 0130: F5
ld A, (pair_buf)               ; 0131: 3A 00 00
ld L, A                        ; 0134: 6F
pop AF                         ; 0135: F1
push AF                        ; 0136: F5
ld A, (pair_buf + 1)           ; 0137: 3A 00 00
ld H, A                        ; 013A: 67
pop AF                         ; 013B: F1
__zax_epilogue_1:
pop DE                         ; 013C: D1
pop BC                         ; 013D: C1
pop AF                         ; 013E: F1
ld SP, IX                      ; 013F: DD F9
pop IX                         ; 0141: DD E1
ret                            ; 0143: C9
; func main begin
; func read_pair_word end
main:
push IX                        ; 0144: DD E5
ld IX, $0000                   ; 0146: DD 21 00 00
add IX, SP                     ; 014A: DD 39
push AF                        ; 014C: F5
push BC                        ; 014D: C5
push DE                        ; 014E: D5
push HL                        ; 014F: E5
ld HL, $0002                   ; 0150: 21 02 00
push HL                        ; 0153: E5
ld HL, $0001                   ; 0154: 21 01 00
push HL                        ; 0157: E5
call write_pair                ; 0158: CD 00 00
inc SP                         ; 015B: 33
inc SP                         ; 015C: 33
inc SP                         ; 015D: 33
inc SP                         ; 015E: 33
ld A, (pair_buf)               ; 015F: 3A 00 00
call read_pair_word            ; 0162: CD 00 00
__zax_epilogue_2:
pop HL                         ; 0165: E1
pop DE                         ; 0166: D1
pop BC                         ; 0167: C1
pop AF                         ; 0168: F1
ld SP, IX                      ; 0169: DD F9
pop IX                         ; 016B: DD E1
ret                            ; 016D: C9
; func main end

; symbols:
; label write_pair = $0100
; label __zax_epilogue_0 = $011C
; label read_pair_word = $0125
; label __zax_epilogue_1 = $013C
; label main = $0144
; label __zax_epilogue_2 = $0165
; data pair_buf = $1000
; label __zax_startup = $1002
