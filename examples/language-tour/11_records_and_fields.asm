; ZAX lowered .asm trace
; range: $0100..$0178 (end exclusive)

; func write_pair begin
write_pair:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push HL                        ; 0108: E5
push DE                        ; 0109: D5
push BC                        ; 010A: C5
push AF                        ; 010B: F5
push DE                        ; 010C: D5
push IX                        ; 010D: DD E5
pop HL                         ; 010F: E1
ld DE, $0004                   ; 0110: 11 04 00
add HL, DE                     ; 0113: 19
push HL                        ; 0114: E5
pop DE                         ; 0115: D1
ld a, (hl)                     ; 0116: 7E
ld HL, pair_buf                ; 0117: 21 00 00
ld (hl), a                     ; 011A: 77
push DE                        ; 011B: D5
push IX                        ; 011C: DD E5
pop HL                         ; 011E: E1
ld DE, $0006                   ; 011F: 11 06 00
add HL, DE                     ; 0122: 19
push HL                        ; 0123: E5
pop DE                         ; 0124: D1
ld a, (hl)                     ; 0125: 7E
ld HL, pair_buf + 1            ; 0126: 21 00 00
ld (hl), a                     ; 0129: 77
__zax_epilogue_0:
pop DE                         ; 012A: D1
pop BC                         ; 012B: C1
pop AF                         ; 012C: F1
ld e, (ix-$0002)               ; 012D: DD 5E FE
ld d, (ix-$0001)               ; 0130: DD 56 FF
ex de, hl                      ; 0133: EB
ld SP, IX                      ; 0134: DD F9
pop IX                         ; 0136: DD E1
ret                            ; 0138: C9
; func read_pair_word begin
; func write_pair end
read_pair_word:
push AF                        ; 0139: F5
push BC                        ; 013A: C5
push DE                        ; 013B: D5
ld HL, pair_buf                ; 013C: 21 00 00
ld L, (hl)                     ; 013F: 6E
ld HL, pair_buf + 1            ; 0140: 21 00 00
ld H, (hl)                     ; 0143: 66
__zax_epilogue_1:
pop DE                         ; 0144: D1
pop BC                         ; 0145: C1
pop AF                         ; 0146: F1
ret                            ; 0147: C9
; func main begin
; func read_pair_word end
main:
push IX                        ; 0148: DD E5
ld IX, $0000                   ; 014A: DD 21 00 00
add IX, SP                     ; 014E: DD 39
push HL                        ; 0150: E5
push DE                        ; 0151: D5
push BC                        ; 0152: C5
push AF                        ; 0153: F5
ld HL, $0002                   ; 0154: 21 02 00
push HL                        ; 0157: E5
ld HL, $0001                   ; 0158: 21 01 00
push HL                        ; 015B: E5
call write_pair                ; 015C: CD 00 00
inc SP                         ; 015F: 33
inc SP                         ; 0160: 33
inc SP                         ; 0161: 33
inc SP                         ; 0162: 33
ld A, (pair_buf)               ; 0163: 3A 00 00
call read_pair_word            ; 0166: CD 00 00
__zax_epilogue_2:
pop DE                         ; 0169: D1
pop BC                         ; 016A: C1
pop AF                         ; 016B: F1
ld e, (ix-$0002)               ; 016C: DD 5E FE
ld d, (ix-$0001)               ; 016F: DD 56 FF
ex de, hl                      ; 0172: EB
ld SP, IX                      ; 0173: DD F9
pop IX                         ; 0175: DD E1
ret                            ; 0177: C9
; func main end

; symbols:
; label write_pair = $0100
; label __zax_epilogue_0 = $012A
; label read_pair_word = $0139
; label __zax_epilogue_1 = $0144
; label main = $0148
; label __zax_epilogue_2 = $0169
; var pair_buf = $0178
