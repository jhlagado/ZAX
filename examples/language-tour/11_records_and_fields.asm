; ZAX lowered .asm trace
; range: $0100..$0160 (end exclusive)

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
push AF                        ; 0133: F5
push BC                        ; 0134: C5
push DE                        ; 0135: D5
ld HL, pair_buf                ; 0136: 21 00 00
ld L, (hl)                     ; 0139: 6E
ld HL, pair_buf + 1            ; 013A: 21 00 00
ld H, (hl)                     ; 013D: 66
__zax_epilogue_1:
pop DE                         ; 013E: D1
pop BC                         ; 013F: C1
pop AF                         ; 0140: F1
ret                            ; 0141: C9
; func main begin
; func read_pair_word end
main:
push AF                        ; 0142: F5
push BC                        ; 0143: C5
push DE                        ; 0144: D5
push HL                        ; 0145: E5
ld HL, $0002                   ; 0146: 21 02 00
push HL                        ; 0149: E5
ld HL, $0001                   ; 014A: 21 01 00
push HL                        ; 014D: E5
call write_pair                ; 014E: CD 00 00
inc SP                         ; 0151: 33
inc SP                         ; 0152: 33
inc SP                         ; 0153: 33
inc SP                         ; 0154: 33
ld A, (pair_buf)               ; 0155: 3A 00 00
call read_pair_word            ; 0158: CD 00 00
__zax_epilogue_2:
pop HL                         ; 015B: E1
pop DE                         ; 015C: D1
pop BC                         ; 015D: C1
pop AF                         ; 015E: F1
ret                            ; 015F: C9
; func main end

; symbols:
; label write_pair = $0100
; label __zax_epilogue_0 = $012A
; label read_pair_word = $0133
; label __zax_epilogue_1 = $013E
; label main = $0142
; label __zax_epilogue_2 = $015B
; var pair_buf = $0160
