; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_glob_reg16 begin
byte_glob_reg16:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
push BC                        ; 010C: C5
push DE                        ; 010D: D5
push IX                        ; 010E: DD E5
pop HL                         ; 0110: E1
ld DE, $0004                   ; 0111: 11 04 00
add HL, DE                     ; 0114: 19
push HL                        ; 0115: E5
pop HL                         ; 0116: E1
pop DE                         ; 0117: D1
pop BC                         ; 0118: C1
pop AF                         ; 0119: F1
push DE                        ; 011A: D5
ld E, (HL)                     ; 011B: 5E
inc HL                         ; 011C: 23
ld D, (HL)                     ; 011D: 56
ld L, E                        ; 011E: 6B
ld H, D                        ; 011F: 62
pop DE                         ; 0120: D1
push AF                        ; 0121: F5
push BC                        ; 0122: C5
push DE                        ; 0123: D5
ld DE, glob_bytes              ; 0124: 11 00 00
add HL, DE                     ; 0127: 19
push HL                        ; 0128: E5
pop HL                         ; 0129: E1
pop DE                         ; 012A: D1
pop BC                         ; 012B: C1
pop AF                         ; 012C: F1
ld A, (hl)                     ; 012D: 7E
push AF                        ; 012E: F5
push BC                        ; 012F: C5
push DE                        ; 0130: D5
ld DE, glob_bytes              ; 0131: 11 00 00
add HL, DE                     ; 0134: 19
push HL                        ; 0135: E5
pop HL                         ; 0136: E1
pop DE                         ; 0137: D1
pop BC                         ; 0138: C1
pop AF                         ; 0139: F1
ld (hl), A                     ; 013A: 77
ld H, $0000                    ; 013B: 26 00
ld L, A                        ; 013D: 6F
__zax_epilogue_0:
pop DE                         ; 013E: D1
pop BC                         ; 013F: C1
pop AF                         ; 0140: F1
ld SP, IX                      ; 0141: DD F9
pop IX                         ; 0143: DD E1
ret                            ; 0145: C9
; func byte_glob_reg16 end
; func main begin
main:
push IX                        ; 0146: DD E5
ld IX, $0000                   ; 0148: DD 21 00 00
add IX, SP                     ; 014C: DD 39
push AF                        ; 014E: F5
push BC                        ; 014F: C5
push DE                        ; 0150: D5
push HL                        ; 0151: E5
ld HL, $0004                   ; 0152: 21 04 00
push HL                        ; 0155: E5
call byte_glob_reg16           ; 0156: CD 00 00
inc SP                         ; 0159: 33
inc SP                         ; 015A: 33
__zax_epilogue_1:
pop HL                         ; 015B: E1
pop DE                         ; 015C: D1
pop BC                         ; 015D: C1
pop AF                         ; 015E: F1
ld SP, IX                      ; 015F: DD F9
pop IX                         ; 0161: DD E1
ret                            ; 0163: C9
; func main end

; symbols:
; label byte_glob_reg16 = $0100
; label __zax_epilogue_0 = $013E
; label main = $0146
; label __zax_epilogue_1 = $015B
; data glob_bytes = $2000
; label __zax_startup = $2008
