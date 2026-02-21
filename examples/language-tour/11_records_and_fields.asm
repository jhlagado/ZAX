; ZAX lowered .asm trace
; range: $0100..$0178 (end exclusive)

; func write_pair begin
write_pair:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push HL                        ; 010B: E5
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
pop HL                         ; 012A: E1
pop DE                         ; 012B: D1
pop BC                         ; 012C: C1
pop AF                         ; 012D: F1
ld SP, IX                      ; 012E: DD F9
pop IX                         ; 0130: DD E1
ret                            ; 0132: C9
; func read_pair_word begin
; func write_pair end
read_pair_word:
push IX                        ; 0133: DD E5
ld IX, $0000                   ; 0135: DD 21 00 00
add IX, SP                     ; 0139: DD 39
push AF                        ; 013B: F5
push BC                        ; 013C: C5
push DE                        ; 013D: D5
ld HL, pair_buf                ; 013E: 21 00 00
ld L, (hl)                     ; 0141: 6E
ld HL, pair_buf + 1            ; 0142: 21 00 00
ld H, (hl)                     ; 0145: 66
__zax_epilogue_1:
pop DE                         ; 0146: D1
pop BC                         ; 0147: C1
pop AF                         ; 0148: F1
ld SP, IX                      ; 0149: DD F9
pop IX                         ; 014B: DD E1
ret                            ; 014D: C9
; func main begin
; func read_pair_word end
main:
push IX                        ; 014E: DD E5
ld IX, $0000                   ; 0150: DD 21 00 00
add IX, SP                     ; 0154: DD 39
push AF                        ; 0156: F5
push BC                        ; 0157: C5
push DE                        ; 0158: D5
push HL                        ; 0159: E5
ld HL, $0002                   ; 015A: 21 02 00
push HL                        ; 015D: E5
ld HL, $0001                   ; 015E: 21 01 00
push HL                        ; 0161: E5
call write_pair                ; 0162: CD 00 00
inc SP                         ; 0165: 33
inc SP                         ; 0166: 33
inc SP                         ; 0167: 33
inc SP                         ; 0168: 33
ld A, (pair_buf)               ; 0169: 3A 00 00
call read_pair_word            ; 016C: CD 00 00
__zax_epilogue_2:
pop HL                         ; 016F: E1
pop DE                         ; 0170: D1
pop BC                         ; 0171: C1
pop AF                         ; 0172: F1
ld SP, IX                      ; 0173: DD F9
pop IX                         ; 0175: DD E1
ret                            ; 0177: C9
; func main end

; symbols:
; label write_pair = $0100
; label __zax_epilogue_0 = $012A
; label read_pair_word = $0133
; label __zax_epilogue_1 = $0146
; label main = $014E
; label __zax_epilogue_2 = $016F
; var pair_buf = $0178
